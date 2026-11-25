// The run trace (Guild decision 060): what this run did and where its time went, sent to Guild so
// the run explains itself to you in the Studio, and to Guild across all runs.
//
// It records stages (prepare, work, check, review, revise, deliver), every tool step with its
// timing and error kind, the machine's CPU and memory every 30 seconds, and totals. For your own
// briefs (tries and checks) it may also keep a step's command or path and its error text; for a
// buyer's task it keeps structure only: names from fixed lists, timings and counts, never the
// brief, files, commands or replies. Guild's gateway refuses anything else.
//
// You shouldn't need to change this file. Sending a trace never fails a task.
import { readFile } from "node:fs/promises";
import { availableParallelism, freemem, loadavg, totalmem } from "node:os";
import { basename, relative } from "node:path";
import type { GuildClient } from "./guild.ts";

type Stage = "prepare" | "work" | "check" | "review" | "revise" | "deliver" | "wait";
type Target = "skills" | "references" | "input" | "previous" | "out" | "scratch" | "workspace" | "none";
type StepError = "timeout" | "command_failed" | "not_found" | "permission" | "refused" | "other";

const TOOLS = new Set(["Read", "Write", "Edit", "MultiEdit", "Bash", "Glob", "Grep", "Skill", "TodoWrite", "Task", "NotebookEdit"]);
const MCP_TOOL = /^mcp__[A-Za-z0-9_-]{1,64}__[A-Za-z0-9_-]{1,64}$/;
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,199}$/;
const MAX_STEPS = 4000;
const MAX_SAMPLES = 1500;
const SAMPLE_MS = 30_000;
const UPLOAD_MS = 120_000;

interface StepRecord {
  tool: string;
  target: Target;
  start: number;
  end?: number;
  error?: StepError;
  file?: string;
  text?: string;
  errorText?: string;
}

function clip(value: string, max = 500): string {
  const line = value.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** A step's tool, as Guild names it: the Agent SDK's own tools, an MCP tool, or "other". */
function toolName(name: string): string {
  if (TOOLS.has(name)) return name;
  if (name === "mcp__specialist__ask_buyer" || name === "ask_buyer") return "ask_buyer";
  if (name === "mcp__specialist__call_api" || name === "call_api") return "call_api";
  return MCP_TOOL.test(name) ? name : "other";
}

/** Where a step pointed, by folder of the workspace. */
function targetOf(workdir: string, input: Record<string, unknown>): { target: Target; file?: string } {
  const raw = [input.file_path, input.path, input.notebook_path].find((value): value is string => typeof value === "string");
  if (raw) {
    const rel = relative(workdir, raw.startsWith("/") ? raw : `${workdir}/${raw}`).replace(/\\/g, "/");
    if (rel.startsWith("..")) return { target: "none" };
    if (rel.startsWith(".claude/skills")) return { target: "skills" };
    for (const folder of ["references", "input", "previous"] as const) if (rel === folder || rel.startsWith(`${folder}/`)) return { target: folder };
    if (rel.startsWith("out/")) {
      const name = basename(rel);
      if (name.startsWith("_") || rel.slice(4).startsWith("_")) return { target: "scratch" };
      return { target: "out", ...(SAFE_FILE.test(name) ? { file: name } : {}) };
    }
    return { target: "workspace" };
  }
  const command = typeof input.command === "string" ? input.command : typeof input.pattern === "string" ? input.pattern : "";
  if (!command) return { target: "none" };
  if (/(^|[\s"'=/])out\//.test(command)) return { target: "out" };
  if (/\.claude\/skills/.test(command)) return { target: "skills" };
  return { target: "workspace" };
}

/** What kind of error a tool result was, from its text. */
function errorKind(text: string): StepError {
  if (/timed out|timeout/i.test(text)) return "timeout";
  if (/no such file|not found|ENOENT|does not exist/i.test(text)) return "not_found";
  if (/permission denied|EACCES|EPERM/i.test(text)) return "permission";
  if (/not allowed|refused|denied/i.test(text)) return "refused";
  if (/exit code|exited with|command failed|Error:/i.test(text)) return "command_failed";
  return "other";
}

function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")).join(" ");
  }
  return "";
}

/** CPU time used by this container, from its cgroup (microseconds), if the cgroup says. */
async function cpuUsageMicros(): Promise<number | null> {
  const stat = await readFile("/sys/fs/cgroup/cpu.stat", "utf8").catch(() => null);
  const match = stat ? /usage_usec (\d+)/.exec(stat) : null;
  return match ? Number(match[1]) : null;
}

async function memoryMb(): Promise<number> {
  const current = await readFile("/sys/fs/cgroup/memory.current", "utf8").catch(() => null);
  if (current && /^\d+/.test(current)) return Math.round(Number(current.trim()) / 1_048_576);
  return Math.round((totalmem() - freemem()) / 1_048_576);
}

/** Cores and memory the container may use, from its cgroup when it says. */
async function machine(): Promise<{ cores: number; memMb: number }> {
  const max = await readFile("/sys/fs/cgroup/cpu.max", "utf8").catch(() => null);
  const [quota, period] = (max ?? "").trim().split(/\s+/);
  const cores = quota && quota !== "max" && Number(period) > 0 ? Number(quota) / Number(period) : availableParallelism();
  const memMax = await readFile("/sys/fs/cgroup/memory.max", "utf8").catch(() => null);
  const memMb = memMax && /^\d+/.test(memMax) ? Math.round(Number(memMax.trim()) / 1_048_576) : Math.round(totalmem() / 1_048_576);
  return { cores: Math.max(0.01, Math.round(cores * 100) / 100), memMb: Math.max(1, memMb) };
}

export class Tracer {
  private readonly full: boolean;
  private readonly stages: Array<{ name: Stage; start: number; end?: number; note?: string }> = [];
  private readonly steps: StepRecord[] = [];
  private readonly open = new Map<string, StepRecord>();
  private readonly samples: Array<{ t: number; cpu: number; memMb: number }> = [];
  private readonly replies = new Set<string>();
  private revisions = 0;
  private carryOns = 0;
  private stopped: "steps" | "reply" | "time" | "budget" | undefined;
  private check: { passed: boolean; problems: number; issues?: string[] } | undefined;
  private machineInfo: { cores: number; memMb: number } | undefined;
  private timers: NodeJS.Timeout[] = [];
  private lastCpu: { at: number; micros: number } | null = null;

  private readonly guild: GuildClient;
  private readonly workdir: string;

  constructor(guild: GuildClient, workdir: string, detail: "full" | "structure") {
    this.guild = guild;
    this.workdir = workdir;
    this.full = detail === "full";
  }

  /** Starts sampling the machine and sending the trace every two minutes. */
  async begin(): Promise<void> {
    this.machineInfo = await machine().catch(() => undefined);
    await this.sample();
    this.timers.push(setInterval(() => void this.sample(), SAMPLE_MS), setInterval(() => void this.send(), UPLOAD_MS));
    for (const timer of this.timers) timer.unref?.();
  }

  stage(name: Stage, note?: string): void {
    const now = Date.now();
    const current = this.stages.at(-1);
    if (current && current.end === undefined) current.end = now;
    this.stages.push({ name, start: now, ...(note && this.full ? { note: clip(note) } : {}) });
    if (name === "revise") this.revisions += 1;
  }

  carriedOn(): void {
    this.carryOns += 1;
  }

  stoppedAt(reason: "steps" | "reply" | "time" | "budget" | undefined): void {
    if (reason) this.stopped = reason;
  }

  checked(passed: boolean, issues: string[]): void {
    this.check = { passed, problems: issues.length, ...(this.full ? { issues: issues.slice(0, 30).map((issue) => clip(issue)) } : {}) };
  }

  /** A model reply, counted once by its id. */
  reply(id: string): void {
    this.replies.add(id);
  }

  /**
   * A step began: a tool the agent called. `name` is the tool as the trace names it (the Agent
   * SDK's own names; a harness maps its tools onto them), `input` what it was given.
   */
  stepStarted(id: string, name: string, input: Record<string, unknown>): void {
    if (this.steps.length >= MAX_STEPS) return;
    const where = targetOf(this.workdir, input);
    const said = typeof input.command === "string" ? input.command : [input.file_path, input.path, input.pattern].find((v) => typeof v === "string");
    const step: StepRecord = { tool: toolName(name), target: where.target, start: Date.now(), ...(where.file ? { file: where.file } : {}) };
    if (this.full && typeof said === "string") step.text = clip(String(said).split("\n")[0] ?? "");
    this.steps.push(step);
    this.open.set(id, step);
  }

  /** A step ended. `error` is what it said, if it failed. */
  stepEnded(id: string, error?: string): void {
    const step = this.open.get(id);
    if (!step) return;
    this.open.delete(id);
    step.end = Date.now();
    if (error !== undefined) {
      step.error = errorKind(error);
      if (this.full && error) step.errorText = clip(error);
    }
  }

  /** Reads one Agent SDK message: model replies, tool calls and their results. */
  observe(message: { type: string; message?: { id?: string; content?: unknown } }): void {
    const content = Array.isArray(message.message?.content) ? (message.message!.content as Array<Record<string, unknown>>) : [];
    if (message.type === "assistant") {
      if (message.message?.id) this.reply(message.message.id);
      for (const block of content) {
        if (block.type !== "tool_use" || typeof block.id !== "string" || typeof block.name !== "string") continue;
        this.stepStarted(block.id, block.name, (block.input && typeof block.input === "object" ? block.input : {}) as Record<string, unknown>);
      }
    } else if (message.type === "user") {
      for (const block of content) {
        if (block.type !== "tool_result" || typeof block.tool_use_id !== "string") continue;
        this.stepEnded(block.tool_use_id, block.is_error === true ? resultText(block.content) : undefined);
      }
    }
  }

  private async sample(): Promise<void> {
    if (this.samples.length >= MAX_SAMPLES) return;
    const now = Date.now();
    const micros = await cpuUsageMicros();
    let cpu: number;
    if (micros !== null && this.lastCpu) cpu = (micros - this.lastCpu.micros) / ((now - this.lastCpu.at) * 1000);
    else cpu = loadavg()[0] ?? 0;
    if (micros !== null) this.lastCpu = { at: now, micros };
    this.samples.push({ t: now, cpu: Math.max(0, Math.round(cpu * 100) / 100), memMb: await memoryMb() });
  }

  /** The trace as Guild takes it. */
  toJSON() {
    return {
      version: 1 as const,
      detail: this.full ? ("full" as const) : ("structure" as const),
      runner: (process.env.GUILD_RUNNER_NAME ?? "").replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 100) || undefined,
      ...(this.machineInfo ? { machine: this.machineInfo } : {}),
      stages: this.stages.slice(-60),
      steps: this.steps,
      samples: this.samples,
      totals: { replies: this.replies.size, revisions: this.revisions, carryOns: this.carryOns, ...(this.stopped ? { stopped: this.stopped } : {}) },
      ...(this.check ? { check: this.check } : {}),
    };
  }

  /** Sends the trace. Never throws: a trace that doesn't arrive never fails the task. */
  async send(): Promise<void> {
    await this.guild.trace(this.toJSON()).catch((error) => console.error(`The run trace wasn't sent: ${String(error).slice(0, 200)}`));
  }

  /** Ends the last stage, stops sampling and sends the trace one last time. */
  async end(): Promise<void> {
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
    const current = this.stages.at(-1);
    if (current && current.end === undefined) current.end = Date.now();
    await this.sample();
    await this.send();
  }
}

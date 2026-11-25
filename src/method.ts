// The method: how this specialist turns a brief into finished work. This is
// the file to shape around your craft (docs/anatomy.md, "Method").
//
//   1. Prepare   a fresh workspace: the brief, the buyer's files, your skills and references
//                (and, for a buyer's revision, the earlier delivery in previous/)
//   2. Work      one session of the agent's harness (the Claude Agent SDK for Claude models,
//                the Codex SDK for OpenAI's; src/harness.ts): Guild's rules, then your skills (and specialist/method.md,
//                if you have one; Guild decision 058). If the job can't be
//                done well, the agent writes out/_decline.md and the task fails with its reason
//   3. Judge     checks in code, then a review against Guild's bar, your skills and, if you
//                have one, specialist/rubric.md
//   4. Fix       if the work falls short, the same session fixes what review found, round after
//                round, until it passes (Guild decision 064)
//   5. Deliver   everything in out/, with a summary
//
// Safeguards, not targets (Guild decision 064): the agent isn't told its limits. The runner steps
// in only when a safeguard is reached (the cost or time ceiling, or rounds that stop making
// progress), and then delivers what's in out/ to the creator's sign-off with the reviewer's last
// notes. Nothing is thrown away: the task fails only if nothing was made, the agent broke, or it
// declined.
import { cp, mkdir, readdir, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { guildClient, type Budget, type GuildClient, type StartTaskRequest } from "./guild.ts";
import { harnessFor, loadHarness, safeguardReason, type WorkLimits, type WorkOptions, type WorkResult } from "./harness.ts";
import { checkOutputs, type Verdict } from "./judgement.ts";
import { loadSpecialist, type Specialist } from "./specialist.ts";
import { TOOLKIT_MODULES } from "./guild-rules.ts";
import { Tracer } from "./trace.ts";

export interface TaskControl {
  abort: AbortController;
  finished: boolean;
  waitForAnswer: () => Promise<string>;
}

export async function runSpecialist(task: StartTaskRequest, control: TaskControl): Promise<void> {
  const guild = guildClient(task.taskId);
  const workdir = `/work/${task.taskId}-${task.attempt}`;
  const signal = control.abort.signal;
  // Guild replies to each progress report with the budget so far, for the cost safeguard (decision 064).
  let budget: Budget | null = null;
  const limits: WorkLimits = { startedAt: Date.now(), deadline: Date.parse(task.deadline) || Date.now() + 3 * 60 * 60_000, budget: () => budget };
  // The bar only moves forward: a revision doesn't send it back.
  let shown = 0;
  const progress = async (message: string, percent: number) => {
    shown = Math.max(shown, Math.min(99, percent));
    budget = (await guild.progress(message, shown)) ?? budget;
  };
  // What this run did and where its time went, for the Studio (decision 060). A buyer's task is
  // traced as structure only; that's Guild's choice, sent with the task.
  const tracer = new Tracer(guild, workdir, task.traceDetail ?? "structure");
  try {
    // 1. Prepare -------------------------------------------------------------
    await tracer.begin();
    tracer.stage("prepare");
    await progress("Reading the brief", 5);
    const specialist = await loadSpecialist(task.taskId, guild);
    // The agent's model decides its harness (decision 067): one provider per agent.
    const harness = await loadHarness(harnessFor(specialist.settings.model));
    await prepareWorkspace(specialist, workdir, task, guild);

    // 2. Work ----------------------------------------------------------------
    await progress("Starting work", 10);
    tracer.stage("work");
    // A temporary error from the provider or the network doesn't end the job: pause, then carry on
    // in the same session, up to twice in a task (decision 059).
    let carryOns = 0;
    const steady = async (options: WorkOptions): Promise<WorkResult> => {
      let result = await harness.work(options);
      while (!result.ok && result.temporary && carryOns < 2 && !signal.aborted && !safeguardReason(limits)) {
        carryOns += 1;
        await progress("A temporary error: carrying on in a moment", 0).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 20_000));
        tracer.carriedOn();
        result = await harness.work({ ...options, ...(result.sessionId ? { resume: result.sessionId, carryOn: true, revision: undefined, buyerRevision: undefined } : {}) });
      }
      return result;
    };

    let result = await steady({
      specialist,
      workdir,
      brief: task.brief,
      guild,
      signal,
      waitForAnswer: control.waitForAnswer,
      buyerRevision: task.revision ? { number: task.revision.number, feedback: task.revision.feedback } : undefined,
      limits,
      span: [10, 70],
      progress,
      trace: tracer,
    });

    // 3 and 4. Judge, then fix, round after round, until the work passes (decision 064) -----
    let round = 0;
    let stepCarryOns = 0;
    let last: { issues: string[]; out: string } | null = null;
    let outcome: { passed: true } | { passed: false; stoppedBy: "budget" | "time" | "no-progress" | "review" | "fix-rounds"; notes: string[] };
    for (;;) {
      if (signal.aborted) return;
      // Files the agent put in folders inside out/ come up to out/ itself, so they're checked and delivered.
      await flattenOut(workdir);
      tracer.stoppedAt(result.ok ? undefined : result.stopped);
      // The agent decided the job can't be done well: say why, rather than deliver weak work.
      const decline = await declineReason(workdir);
      if (decline) {
        await tracer.end();
        await guild.fail(decline, false, true);
        return;
      }
      // A session that used its steps, or wrote one reply too long, isn't the end of the task: if
      // no safeguard has been reached, it carries on in the same session (decision 064).
      if (!result.ok && (result.stopped === "steps" || result.stopped === "reply") && !safeguardReason(limits) && stepCarryOns < 10) {
        stepCarryOns += 1;
        tracer.carriedOn();
        result = await steady({ ...sessionOptions(), resume: result.sessionId, carryOn: true });
        continue;
      }
      const made = await hasDeliverables(workdir);
      if (!result.ok && !result.stopped && !made) {
        await tracer.end();
        await guild.fail(result.summary, true);
        return;
      }
      if (!made) {
        await tracer.end();
        await guild.fail(`${result.summary} Nothing was in out/ to deliver.`, true);
        return;
      }
      // A safeguard was reached while working: deliver what's there with the last review's notes.
      const reached = safeguardReason(limits) ?? (result.stopped === "time" || result.stopped === "budget" ? result.stopped : null);
      if (reached) {
        outcome = { passed: false, stoppedBy: reached, notes: last?.issues ?? ["The work stopped before it was reviewed."] };
        break;
      }
      await progress(round === 0 ? "Checking the work" : `Checking round ${round} of fixes`, round === 0 ? 75 : 85);
      tracer.stage("check");
      const problems = await checkOutputs(specialist, workdir);
      if (problems.length === 0) tracer.stage("review");
      const verdict: Verdict = problems.length > 0 ? { pass: false, issues: problems, summary: "", reached: true } : await reviewTwice();
      tracer.checked(verdict.pass, verdict.issues);
      if (verdict.pass) {
        outcome = { passed: true };
        break;
      }
      if (!verdict.reached) {
        outcome = { passed: false, stoppedBy: "review", notes: verdict.issues };
        break;
      }
      // No progress: the same problems twice running, or a round of fixes that changed nothing.
      const out = await outState(workdir);
      if (last && (sameIssues(last.issues, verdict.issues) || last.out === out)) {
        outcome = { passed: false, stoppedBy: "no-progress", notes: verdict.issues };
        break;
      }
      // An optional upper bound a creator may set; by default the rounds aren't counted.
      const most = specialist.settings.maxFixRounds;
      if (typeof most === "number" && round >= most) {
        outcome = { passed: false, stoppedBy: "fix-rounds", notes: verdict.issues };
        break;
      }
      const stop = safeguardReason(limits);
      if (stop) {
        outcome = { passed: false, stoppedBy: stop, notes: verdict.issues };
        break;
      }
      last = { issues: verdict.issues, out };
      round += 1;
      await progress(`Fixing ${verdict.issues.length} thing${verdict.issues.length === 1 ? "" : "s"} review found`, 76);
      tracer.stage("revise");
      result = await steady({ ...sessionOptions(), resume: result.sessionId, revision: verdict.issues });
    }

    // 5. Deliver ---------------------------------------------------------------
    await progress("Delivering", 95);
    tracer.stage("deliver");
    const delivered = await deliverOutputs(workdir, guild);
    control.finished = true;
    // A session that stopped at a safeguard never wrote its summary for the buyer: name what's delivered.
    const summary = result.ok ? result.summary : `Here is the work: ${delivered.join(", ")}.`;
    await tracer.end();
    await guild.complete(summary.slice(0, 1800), delivered, {
      turns: result.turns,
      fixRounds: round,
      reviewPassed: outcome.passed,
      ...(outcome.passed ? {} : { stoppedBy: outcome.stoppedBy, reviewNotes: JSON.stringify(outcome.notes.map((note) => note.slice(0, 1500))).slice(0, 12_000) }),
    });

    /** The options every session of this task shares. */
    function sessionOptions(): WorkOptions {
      return {
        specialist,
        workdir,
        brief: task.brief,
        guild,
        signal,
        waitForAnswer: control.waitForAnswer,
        limits,
        span: [76, 90],
        progress,
        trace: tracer,
      };
    }

    /** A review that couldn't reach a verdict is tried once more (decision 064). */
    async function reviewTwice(): Promise<Verdict> {
      const first = await harness.review({ specialist, workdir, brief: task.brief, signal });
      return first.reached ? first : harness.review({ specialist, workdir, brief: task.brief, signal });
    }
  } catch (error) {
    console.error(error);
    if (!signal.aborted && !control.finished) {
      await tracer.end();
      await guild.fail(`The agent hit an error: ${String((error as Error).message ?? error).slice(0, 500)}`, true).catch(() => {});
    }
  }
}

/**
 * The working folder for one task. It starts empty every time: nothing is
 * carried between tasks or buyers.
 *
 *   brief.json          the buyer's brief
 *   input/              the buyer's files
 *   previous/           for a buyer's revision: the delivery being revised
 *   references/         your reference library (specialist/references)
 *   .claude/skills/     your skills (specialist/skills), loaded by the harness
 *   .agents/skills      the same folder, where Codex looks for skills
 *   out/                what the agent delivers
 */
async function prepareWorkspace(specialist: Specialist, workdir: string, task: StartTaskRequest, guild: GuildClient): Promise<void> {
  await mkdir(join(workdir, "input"), { recursive: true });
  await mkdir(join(workdir, "out"), { recursive: true });
  await writeFile(join(workdir, "brief.json"), JSON.stringify(task.brief, null, 2));
  // The runner's web toolkit (GLD-267), where imports in the workspace find it. Not delivered: only out/ is.
  await symlink(TOOLKIT_MODULES, join(workdir, "node_modules")).catch(() => {});
  // Both are optional: an agent may have only skills, or (from before decision 058) only a method.
  for (const [from, to] of [["skills", join(".claude", "skills")], ["references", "references"]] as const) {
    await mkdir(join(specialist.dir, from), { recursive: true });
    await cp(join(specialist.dir, from), join(workdir, to), { recursive: true });
  }
  // Codex looks for skills in .agents/skills: the same folder, under its name too (decision 067).
  await mkdir(join(workdir, ".agents"), { recursive: true });
  await symlink(join("..", ".claude", "skills"), join(workdir, ".agents", "skills")).catch(() => {});
  for (const file of task.files) {
    await writeFile(join(workdir, "input", file.name), await guild.readFile(file.name));
  }
  // A buyer's revision: the delivery being revised goes in previous/.
  if (task.revision) {
    await mkdir(join(workdir, "previous"), { recursive: true });
    for (const file of task.revision.files) {
      await writeFile(join(workdir, "previous", file.name), await guild.readRevisionFile(file.name));
    }
  }
}

/**
 * Moves every file in folders inside out/ up to out/ itself (Guild delivers only out/'s own files).
 * A file keeps its name unless another has it, then it's named after its folders
 * (out/screenshots/hover.png becomes hover.png, or screenshots-hover.png). Folders whose names
 * start with "_" are scratch and stay where they are, like node_modules.
 */
export async function flattenOut(workdir: string): Promise<void> {
  const out = join(workdir, "out");
  const taken = new Set((await readdir(out, { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isFile()).map((entry) => entry.name));
  const walk = async (dir: string, trail: string[]): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith("_") && !entry.name.startsWith(".") && entry.name !== "node_modules") await walk(path, [...trail, entry.name]);
      } else if (entry.isFile() && trail.length > 0 && !entry.name.startsWith("_")) {
        let name = basename(entry.name);
        if (taken.has(name)) name = [...trail, name].join("-");
        for (let n = 2; taken.has(name); n++) name = `${[...trail].join("-")}-${n}-${basename(entry.name)}`;
        taken.add(name);
        await rename(path, join(out, name));
      }
    }
  };
  for (const entry of await readdir(out, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      await walk(join(out, entry.name), [entry.name]);
      await rm(join(out, entry.name), { recursive: true, force: true }).catch(() => {});
    }
  }
}

/** The same problems again: most of their words in common, in any order (decision 064). */
export function sameIssues(before: string[], after: string[]): boolean {
  const words = (issues: string[]) => new Set(issues.join(" ").toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
  const a = words(before);
  const b = words(after);
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared / (a.size + b.size - shared) >= 0.8;
}

/** What's in out/ (names, sizes and modification times), to tell whether a round changed anything. */
async function outState(workdir: string): Promise<string> {
  const out = join(workdir, "out");
  const names = (await readdir(out).catch(() => [] as string[])).sort();
  const parts: string[] = [];
  for (const name of names) {
    const info = await stat(join(out, name)).catch(() => null);
    if (info?.isFile()) parts.push(`${name}:${info.size}:${info.mtimeMs}`);
  }
  return parts.join("|");
}

/** Whether out/ has anything the buyer would get (names starting with "_" are scratch). */
async function hasDeliverables(workdir: string): Promise<boolean> {
  const names = await readdir(join(workdir, "out")).catch(() => [] as string[]);
  return names.some((name) => !name.startsWith("_"));
}

/** The agent's reason for declining, from out/_decline.md, if it wrote one. */
async function declineReason(workdir: string): Promise<string | null> {
  const text = await readFile(join(workdir, "out", "_decline.md"), "utf8").catch(() => "");
  return text.trim() ? text.trim().slice(0, 1500) : null;
}

const CONTENT_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".html": "text/html",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".zip": "application/zip",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Source is text, so Guild shows it as code, and runs a .tsx or .jsx component live (decision 061).
  ".tsx": "text/plain",
  ".ts": "text/plain",
  ".jsx": "text/plain",
  ".js": "text/plain",
  ".mjs": "text/plain",
  ".css": "text/plain",
  ".py": "text/plain",
  ".yaml": "text/plain",
  ".yml": "text/plain",
};

/** Delivers every file in out/, except names starting with "_", which are scratch. */
async function deliverOutputs(workdir: string, guild: GuildClient): Promise<string[]> {
  const delivered: string[] = [];
  for (const name of (await readdir(join(workdir, "out"))).sort()) {
    const path = join(workdir, "out", name);
    if (name.startsWith("_") || !(await stat(path)).isFile()) continue;
    await guild.deliver(name, await readFile(path), CONTENT_TYPES[extname(name).toLowerCase()] ?? "application/octet-stream");
    delivered.push(name);
  }
  return delivered;
}

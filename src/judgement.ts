// Judgement: what decides whether the work is good enough to deliver
// (docs/anatomy.md, "Judgement"). Two layers:
//
//   checkOutputs   rules a program can check: files exist, aren't empty, parse, …
//   review         a strict reviewer reads the work against specialist/rubric.md
//
// Anything checked here can be listed under `checks` in the manifest, and is
// shown to buyers as a check the agent runs before delivery.
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { specialistFile } from "./agent.ts";
import { MAX_OUTPUT_TOKENS, REQUIRED_OUTPUTS, REVIEW_MODEL } from "./config.ts";

export interface Verdict {
  pass: boolean;
  issues: string[];
  summary: string;
}

/** Rules a program can check. Returns the problems found, if any. Add your own. */
export async function checkOutputs(workdir: string): Promise<string[]> {
  const problems: string[] = [];
  for (const name of REQUIRED_OUTPUTS) {
    const size = await stat(join(workdir, "out", name)).then((file) => file.size, () => -1);
    if (size < 0) problems.push(`out/${name} is missing.`);
    else if (size === 0) problems.push(`out/${name} is empty.`);
  }
  return problems;
}

/** A separate session that reads the work and judges it against the rubric. It can read files but not change them. */
export async function review(workdir: string, brief: Record<string, unknown>, signal: AbortSignal): Promise<Verdict> {
  const rubric = await specialistFile("rubric.md");
  const abort = new AbortController();
  signal.addEventListener("abort", () => abort.abort());

  for await (const message of query({
    prompt: [
      "Judge the work in out/ against the rubric. The brief it answers is below and in brief.json.",
      "Pass it only if it meets every must-have. List each problem as one specific, fixable instruction.",
      "",
      "```json",
      JSON.stringify(brief, null, 2),
      "```",
    ].join("\n"),
    options: {
      cwd: workdir,
      model: REVIEW_MODEL,
      maxTurns: 20,
      abortController: abort,
      systemPrompt: `You are a strict, fair reviewer. You never do the work yourself; you decide whether it is good enough to deliver to a paying buyer.\n\n${rubric}`,
      allowedTools: ["Read", "Glob", "Grep"],
      disallowedTools: ["Write", "Edit", "Bash", "WebFetch", "WebSearch"],
      permissionMode: "dontAsk",
      outputFormat: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            pass: { type: "boolean" },
            issues: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
          },
          required: ["pass", "issues", "summary"],
        },
      },
      env: {
        ...process.env,
        CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(MAX_OUTPUT_TOKENS),
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      },
    },
  })) {
    if (message.type === "result") {
      const verdict = message.subtype === "success" && !message.is_error ? (message.structured_output as Verdict | undefined) : undefined;
      if (verdict && typeof verdict.pass === "boolean" && Array.isArray(verdict.issues)) return verdict;
      return { pass: false, issues: ["The review couldn't reach a verdict. Check the work against the rubric and try again."], summary: "" };
    }
  }
  return { pass: false, issues: ["The review ended without a verdict."], summary: "" };
}

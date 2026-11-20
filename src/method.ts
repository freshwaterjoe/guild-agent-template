// The method: how this specialist turns a brief into finished work. This is
// the file to shape around your craft (docs/anatomy.md, "Method").
//
//   1. Prepare   a fresh workspace: the brief, the buyer's files, your skills and references
//                (and, for a buyer's revision, the earlier delivery in previous/)
//   2. Work      one Agent SDK session: Guild's rules, then your skills (and specialist/method.md,
//                if you have one; Guild decision 058). If the job can't be
//                done well, the agent writes out/_decline.md and the task fails with its reason
//   3. Judge     checks in code, then a review against Guild's bar, your skills and, if you
//                have one, specialist/rubric.md
//   4. Revise    if the work falls short, the same session fixes what review found
//   5. Deliver   everything in out/, with a summary
//
// A session that uses all its steps (maxTurns) doesn't lose its work: whatever is in out/ is
// judged as usual, and the task fails only if there's nothing there (GLD-272).
import { cp, mkdir, readdir, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { work, type WorkLimits } from "./agent.ts";
import { guildClient, type GuildClient, type StartTaskRequest } from "./guild.ts";
import { checkOutputs, review } from "./judgement.ts";
import { loadSpecialist, type Specialist } from "./specialist.ts";
import { TOOLKIT_MODULES } from "./guild-rules.ts";

export interface TaskControl {
  abort: AbortController;
  finished: boolean;
  waitForAnswer: () => Promise<string>;
}

export async function runSpecialist(task: StartTaskRequest, control: TaskControl): Promise<void> {
  const guild = guildClient(task.taskId);
  const workdir = `/work/${task.taskId}-${task.attempt}`;
  const signal = control.abort.signal;
  const limits: WorkLimits = { startedAt: Date.now(), deadline: Date.parse(task.deadline) || Date.now() + 30 * 60_000 };
  // The bar only moves forward: a revision doesn't send it back.
  let shown = 0;
  const progress = async (message: string, percent: number) => {
    shown = Math.max(shown, Math.min(99, percent));
    await guild.progress(message, shown);
  };
  try {
    // 1. Prepare -------------------------------------------------------------
    await progress("Reading the brief", 5);
    const specialist = await loadSpecialist(task.taskId, guild);
    await prepareWorkspace(specialist, workdir, task, guild);

    // 2. Work ----------------------------------------------------------------
    await progress("Starting work", 10);
    let result = await work({
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
    });

    // 3 and 4. Judge, then revise until the work passes or revisions run out --
    for (let revision = 0; ; revision++) {
      if (signal.aborted) return;
      // Out of steps: judge what's in out/, if anything, rather than throw it away.
      const outOfSteps = !result.ok && result.outOfSteps && (await hasDeliverables(workdir));
      if (!result.ok && !outOfSteps) {
        const advice = result.outOfSteps
          ? ` Nothing was in out/ to check. Raise "Steps per working session" under Limits and models, or choose Sonnet to do the work.`
          : "";
        await guild.fail(`${result.summary}${advice}`, true);
        return;
      }
      // The agent decided the job can't be done well: say why, rather than deliver weak work.
      const decline = await declineReason(workdir);
      if (decline) {
        await guild.fail(decline, false);
        return;
      }
      const checking = revision === 0 ? "Checking the work" : `Checking the revision (${revision})`;
      await progress(outOfSteps ? `Out of steps: ${checking.toLowerCase()} in out/` : checking, revision === 0 ? 75 : 91);
      const problems = await checkOutputs(specialist, workdir);
      const verdict = problems.length > 0 ? { pass: false, issues: problems, summary: "" } : await review(specialist, workdir, task.brief, signal);
      if (verdict.pass) break;
      if (revision >= specialist.settings.maxRevisions) {
        await guild.fail(`The work didn't pass its checks: ${verdict.issues.join("; ").slice(0, 1500)}`, true);
        return;
      }
      await progress(`Revising: ${verdict.issues.length} thing${verdict.issues.length === 1 ? "" : "s"} to fix`, 76);
      result = await work({
        specialist,
        workdir,
        brief: task.brief,
        guild,
        signal,
        waitForAnswer: control.waitForAnswer,
        resume: result.sessionId,
        revision: verdict.issues,
        limits,
        span: [76, 90],
        progress,
      });
    }

    // 5. Deliver ---------------------------------------------------------------
    await progress("Delivering", 95);
    const delivered = await deliverOutputs(workdir, guild);
    control.finished = true;
    // A session that ran out of steps never wrote its summary for the buyer: name what's delivered.
    const summary = result.ok ? result.summary : `Here is your work: ${delivered.join(", ")}.`;
    await guild.complete(summary.slice(0, 1800), delivered, { turns: result.turns });
  } catch (error) {
    console.error(error);
    if (!signal.aborted && !control.finished) {
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
 *   .claude/skills/     your skills (specialist/skills), loaded by the Agent SDK
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
  ".svg": "image/svg+xml",
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

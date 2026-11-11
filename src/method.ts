// The method: how this specialist turns a brief into finished work. This is
// the file to shape around your craft (docs/anatomy.md, "Method").
//
//   1. Prepare   a fresh workspace: the brief, the buyer's files, your skills and references
//                (and, for a buyer's revision, the earlier delivery in previous/)
//   2. Work      one Agent SDK session, following specialist/method.md. If the job can't be
//                done well, the agent writes out/_decline.md and the task fails with its reason
//   3. Judge     checks in code, then a review against specialist/rubric.md
//   4. Revise    if the work falls short, the same session fixes what review found
//   5. Deliver   everything in out/, with a summary
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { work } from "./agent.ts";
import { guildClient, type GuildClient, type StartTaskRequest } from "./guild.ts";
import { checkOutputs, review } from "./judgement.ts";
import { loadSpecialist, type Specialist } from "./specialist.ts";

export interface TaskControl {
  abort: AbortController;
  finished: boolean;
  waitForAnswer: () => Promise<string>;
}

export async function runSpecialist(task: StartTaskRequest, control: TaskControl): Promise<void> {
  const guild = guildClient(task.taskId);
  const workdir = `/work/${task.taskId}-${task.attempt}`;
  const signal = control.abort.signal;
  try {
    // 1. Prepare -------------------------------------------------------------
    await guild.progress("Reading the brief", 5);
    const specialist = await loadSpecialist(task.taskId, guild);
    await prepareWorkspace(specialist, workdir, task, guild);

    // 2. Work ----------------------------------------------------------------
    await guild.progress("Starting work", 10);
    let result = await work({
      specialist,
      workdir,
      brief: task.brief,
      guild,
      signal,
      waitForAnswer: control.waitForAnswer,
      buyerRevision: task.revision ? { number: task.revision.number, feedback: task.revision.feedback } : undefined,
    });

    // 3 and 4. Judge, then revise until the work passes or revisions run out --
    for (let revision = 0; ; revision++) {
      if (signal.aborted) return;
      if (!result.ok) {
        await guild.fail(result.summary, true);
        return;
      }
      // The agent decided the job can't be done well: say why, rather than deliver weak work.
      const decline = await declineReason(workdir);
      if (decline) {
        await guild.fail(decline, false);
        return;
      }
      await guild.progress(revision === 0 ? "Checking the work" : `Checking the revision (${revision})`, 80);
      const problems = await checkOutputs(specialist, workdir);
      const verdict = problems.length > 0 ? { pass: false, issues: problems, summary: "" } : await review(specialist, workdir, task.brief, signal);
      if (verdict.pass) break;
      if (revision >= specialist.settings.maxRevisions) {
        await guild.fail(`The work didn't pass its checks: ${verdict.issues.join("; ").slice(0, 1500)}`, true);
        return;
      }
      await guild.progress(`Revising: ${verdict.issues.length} thing${verdict.issues.length === 1 ? "" : "s"} to fix`, 85);
      result = await work({
        specialist,
        workdir,
        brief: task.brief,
        guild,
        signal,
        waitForAnswer: control.waitForAnswer,
        resume: result.sessionId,
        revision: verdict.issues,
      });
    }

    // 5. Deliver ---------------------------------------------------------------
    await guild.progress("Delivering", 95);
    const delivered = await deliverOutputs(workdir, guild);
    control.finished = true;
    await guild.complete(result.summary.slice(0, 1800), delivered, { turns: result.turns });
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
  await cp(join(specialist.dir, "skills"), join(workdir, ".claude", "skills"), { recursive: true });
  await cp(join(specialist.dir, "references"), join(workdir, "references"), { recursive: true });
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

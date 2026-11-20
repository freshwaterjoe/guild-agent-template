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
// A session that stops at a limit (all its steps, a reply longer than maxOutputTokens, or three
// quarters of the time or four fifths of the budget) doesn't lose its work: whatever is in out/ is
// judged as usual, and the task fails only if there's nothing there (Guild GLD-272, decision 059).
import { cp, mkdir, readdir, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { work, wrapUpReason, type WorkLimits, type WorkResult } from "./agent.ts";
import { guildClient, type Budget, type GuildClient, type StartTaskRequest } from "./guild.ts";
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
  // Guild replies to each progress report with the budget so far, which paces the work (decision 059).
  let budget: Budget | null = null;
  const limits: WorkLimits = { startedAt: Date.now(), deadline: Date.parse(task.deadline) || Date.now() + 30 * 60_000, budget: () => budget };
  // The bar only moves forward: a revision doesn't send it back.
  let shown = 0;
  const progress = async (message: string, percent: number) => {
    shown = Math.max(shown, Math.min(99, percent));
    budget = (await guild.progress(message, shown)) ?? budget;
  };
  try {
    // 1. Prepare -------------------------------------------------------------
    await progress("Reading the brief", 5);
    const specialist = await loadSpecialist(task.taskId, guild);
    await prepareWorkspace(specialist, workdir, task, guild);

    // 2. Work ----------------------------------------------------------------
    await progress("Starting work", 10);
    // A temporary error from the provider or the network doesn't end the job: pause, then carry on
    // in the same session, up to twice in a task (decision 059).
    let carryOns = 0;
    const steady = async (options: Parameters<typeof work>[0]): Promise<WorkResult> => {
      let result = await work(options);
      while (!result.ok && result.temporary && carryOns < 2 && !signal.aborted && !wrapUpReason(limits)) {
        carryOns += 1;
        await progress("A temporary error: carrying on in a moment", 0).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 20_000));
        result = await steady({ ...options, ...(result.sessionId ? { resume: result.sessionId, carryOn: true, revision: undefined, buyerRevision: undefined } : {}) });
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
    });

    // 3 and 4. Judge, then revise until the work passes or revisions run out --
    for (let revision = 0; ; revision++) {
      if (signal.aborted) return;
      // Files the agent put in folders inside out/ come up to out/ itself, so they're checked and delivered.
      await flattenOut(workdir);
      // Stopped at a limit: judge what's in out/, if anything, rather than throw it away.
      const stopped = !result.ok && result.stopped && (await hasDeliverables(workdir)) ? result.stopped : undefined;
      if (!result.ok && !stopped) {
        const advice = result.stopped ? " Nothing was in out/ to check." : "";
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
      const why = stopped ? { steps: "Out of steps", reply: "A reply was too long", time: "Nearly out of time", budget: "Nearly at the budget" }[stopped] : "";
      await progress(why ? `${why}: ${checking.toLowerCase()} in out/` : checking, revision === 0 ? 75 : 91);
      const problems = await checkOutputs(specialist, workdir);
      const verdict = problems.length > 0 ? { pass: false, issues: problems, summary: "" } : await review(specialist, workdir, task.brief, signal);
      if (verdict.pass) break;
      // No revision without room for it and its check: the deadline and budget still hold.
      if (revision >= specialist.settings.maxRevisions || wrapUpReason(limits)) {
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
    // A session that stopped at a limit never wrote its summary for the buyer: name what's delivered.
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

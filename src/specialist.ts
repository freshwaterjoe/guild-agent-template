// Where this agent's own files come from (Guild decision 032). Built into the image, they're in
// specialist/ beside this code. Run as Guild's shared runner (GUILD_CONTENT=1), they're fetched
// from Guild when the task starts, so one image runs every agent whose code is the template's.
//
// You shouldn't need to change this file: your agent's settings are in specialist/settings.json.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import type { GuildClient } from "./guild.ts";
import { loadSettings, type Settings } from "./config.ts";

export interface DeclaredHost {
  host: string;
  purpose: string;
  key?: { secret: string; in: "header" | "query" | "basic"; name?: string; required?: boolean };
}

export interface Specialist {
  /** The folder holding skills/ and, if the agent has them, method.md, rubric.md, references/ and settings.json (and instructions.md, in older agents). */
  dir: string;
  settings: Settings;
  /** The outside hosts the manifest declares, with where each one's key goes. */
  hosts: DeclaredHost[];
}

interface ContentBundle {
  format: number;
  files: Array<{ path: string; encoding: "utf8" | "base64"; data: string }>;
}

async function fromFolder(root: string): Promise<Specialist> {
  const manifest = JSON.parse(await readFile(join(root, "guild.manifest.json"), "utf8").catch(() => "{}")) as { network?: { hosts?: DeclaredHost[] } };
  const dir = join(root, "specialist");
  return { dir, settings: await loadSettings(dir), hosts: manifest.network?.hosts ?? [] };
}

/** This task's specialist: from Guild if this is the shared runner, otherwise from the image. */
export async function loadSpecialist(taskId: string, guild: GuildClient): Promise<Specialist> {
  if (process.env.GUILD_CONTENT !== "1") return fromFolder(process.cwd());
  const bundle = (await guild.content()) as ContentBundle;
  if (bundle.format !== 1 || !Array.isArray(bundle.files)) throw new Error("Guild sent content this runner doesn't understand.");
  const root = `/work/_content/${taskId}`;
  for (const file of bundle.files) {
    const path = normalize(join(root, file.path));
    // Guild checks every path when the content is submitted; this is a second guard.
    if (!path.startsWith(`${root}/`)) throw new Error(`Content path ${file.path} is outside the agent's folder.`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.encoding === "base64" ? Buffer.from(file.data, "base64") : file.data);
  }
  await mkdir(join(root, "specialist", "skills"), { recursive: true });
  await mkdir(join(root, "specialist", "references"), { recursive: true });
  return fromFolder(root);
}

/** A file from specialist/, without the HTML comments that guide whoever edits it. */
export async function specialistFile(specialist: Specialist, name: string): Promise<string> {
  return (await readFile(join(specialist.dir, name), "utf8")).replace(/<!--[\s\S]*?-->/g, "").trim();
}

// Your agent's settings live in specialist/settings.json, beside its instructions and method, so
// they travel with the agent's content (Guild decision 032). This file reads them, with the
// defaults below for anything left out. Keep the models in step with guild.manifest.json: Guild
// refuses models the manifest doesn't list, and holds the agent to the manifest's budget and deadline.
//
// The same rules are checked by `npm run guild -- check` and when you submit, so a typo here is
// caught before Guild runs it.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface ServiceConnection {
  /** Tools are named mcp__<name>__<tool>. */
  name: string;
  /** A remote MCP server, over HTTPS, on a host under network.hosts. */
  url: string;
  description?: string;
  /** Put before the key in its header, such as "Bearer ". */
  keyPrefix?: string;
  /** Only these of its tools, if set. */
  tools?: string[];
}

export interface ApiConnection {
  /** A host under network.hosts, called with the call_api tool. */
  host: string;
  /** How to use it: endpoints, parameters, examples. */
  docs?: string;
  /** Put before the key in its header, such as "Bearer ". */
  keyPrefix?: string;
}

export interface Settings {
  /** Does the work. Must be listed under `models` in the manifest. */
  model: string;
  /** Reviews the work against specialist/rubric.md before delivery. Also listed in the manifest. */
  reviewModel: string;
  /** Most steps (model replies) in one working session. */
  maxTurns: number;
  /** How many times the agent revises its own work after review finds problems. */
  maxRevisions: number;
  /**
   * The most a single model reply may write. Guild reserves each call's worst-case cost from the
   * task's budget before it runs, so an uncapped call can be refused once the budget runs low.
   */
  maxOutputTokens: number;
  /** Files the agent must write to out/ for the work to count as done. */
  requiredOutputs: string[];
  connections: { services: ServiceConnection[]; apis: ApiConnection[] };
}

export const DEFAULT_SETTINGS: Settings = {
  model: "claude-opus-5-5",
  reviewModel: "claude-opus-5-5",
  maxTurns: 60,
  maxRevisions: 2,
  maxOutputTokens: 16_000,
  requiredOutputs: [],
  connections: { services: [], apis: [] },
};

/** specialist/settings.json, with the defaults for anything it leaves out. */
export async function loadSettings(specialistDir: string): Promise<Settings> {
  const text = await readFile(join(specialistDir, "settings.json"), "utf8").catch(() => "");
  const given = (text.trim() ? JSON.parse(text) : {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...given,
    connections: {
      services: given.connections?.services ?? [],
      apis: given.connections?.apis ?? [],
    },
  };
}

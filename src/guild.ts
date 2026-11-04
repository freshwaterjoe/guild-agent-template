// The Guild task protocol (version 1), from the agent's side. You shouldn't need
// to change this file. Everything goes to GUILD_URL, which Guild sets.

const GUILD_URL = process.env.GUILD_URL ?? "http://guild.internal";
const TOKEN = process.env.GUILD_TASK_TOKEN ?? "";

export interface StartTaskRequest {
  taskId: string;
  attempt: number;
  brief: Record<string, unknown>;
  files: { name: string; contentType: string; sizeBytes: number }[];
  budgetMicros: number;
  deadline: string;
}

async function call(method: string, path: string, body?: BodyInit, contentType = "application/json"): Promise<Response> {
  const response = await fetch(`${GUILD_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": contentType },
    body,
  });
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${await response.text()}`);
  return response;
}

export function guildClient(taskId: string) {
  const base = `/v1/tasks/${taskId}`;
  return {
    progress: (message: string, percent?: number) =>
      call("POST", `${base}/events`, JSON.stringify({ state: "working", message, percent })),
    ask: (question: string) => call("POST", `${base}/events`, JSON.stringify({ state: "input-required", question })),
    readFile: async (name: string) =>
      new Uint8Array(await (await call("GET", `${base}/files/${encodeURIComponent(name)}`)).arrayBuffer()),
    deliver: (name: string, content: Uint8Array | string, contentType: string) =>
      call("PUT", `${base}/deliverables/${encodeURIComponent(name)}`, content as BodyInit, contentType),
    complete: (summary: string, deliverables: string[], metadata: Record<string, string | number | boolean>) =>
      call("POST", `${base}/complete`, JSON.stringify({ summary, deliverables, metadata })),
    fail: (reason: string, retryable: boolean) => call("POST", `${base}/fail`, JSON.stringify({ reason, retryable })),
  };
}

export type GuildClient = ReturnType<typeof guildClient>;

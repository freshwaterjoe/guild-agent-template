// The container's entry point: Guild's task protocol (version 1). Guild pushes
// a task in; this hands it to the method (src/method.ts) and passes on the
// buyer's answers and cancellations. You shouldn't need to change this file.
import { createServer, type IncomingMessage } from "node:http";
import { guildClient, type StartTaskRequest } from "./guild.ts";
import { loadHarness } from "./harness.ts";
import { runSpecialist, type TaskControl } from "./method.ts";

const PORT = 8080;

interface TaskState extends TaskControl {
  answers: string[];
  waiting: ((answer: string) => void) | null;
}

const tasks = new Map<string, TaskState>();

// Start the harness's own program once at boot, so its first launch overlaps with task setup.
// GUILD_HARNESS is set in Guild's runner images (the Dockerfile), which hold one harness each; a
// copy of this template with both installed warms up Claude's, the template's default.
void loadHarness(process.env.GUILD_HARNESS === "codex" ? "codex" : "claude").then((harness) => harness.warmUp(), () => {});

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let data = "";
  for await (const chunk of request) data += chunk;
  return data ? (JSON.parse(data) as Record<string, unknown>) : {};
}

createServer(async (request, response) => {
  const send = (status: number, body: unknown) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  const parts = (request.url ?? "/").split("/").filter(Boolean);

  if (request.method === "GET" && request.url === "/health") return send(200, { status: "ok", protocol: "1" });

  if (request.method === "POST" && request.url === "/tasks") {
    const task = (await readJson(request)) as unknown as StartTaskRequest;
    const state: TaskState = {
      abort: new AbortController(),
      finished: false,
      answers: [],
      waiting: null,
      waitForAnswer: () =>
        new Promise((resolve) => {
          const queued = state.answers.shift();
          if (queued !== undefined) resolve(queued);
          else state.waiting = resolve;
        }),
    };
    tasks.set(task.taskId, state);
    send(202, { accepted: true });
    void runSpecialist(task, state);
    return;
  }

  const state = parts[0] === "tasks" && parts[1] ? tasks.get(parts[1]) : undefined;
  if (request.method === "POST" && parts[2] === "messages" && state) {
    const { text } = await readJson(request);
    if (state.waiting) {
      state.waiting(String(text));
      state.waiting = null;
    } else {
      state.answers.push(String(text));
    }
    return send(202, { accepted: true });
  }
  if (request.method === "POST" && parts[2] === "cancel" && state) {
    state.abort.abort();
    return send(202, { accepted: true });
  }
  send(404, { error: "not found" });
}).listen(PORT, () => console.log(`Listening on ${PORT}`));

// Asked to stop (for example, a host restart): tell Guild, so the task can be retried.
process.on("SIGTERM", async () => {
  await Promise.all(
    [...tasks.entries()]
      .filter(([, state]) => !state.finished && !state.abort.signal.aborted)
      .map(([taskId]) => guildClient(taskId).fail("The container was asked to stop.", true).catch(() => {})),
  );
  process.exit(0);
});

// Guild agent kit 2026-11-16 (a58e241). Generated from Guild's packages/kit: don't edit.
// Update it by copying guild-kit/ from the latest agent template.
import { createRequire as __guildCreateRequire } from "node:module";
const require = __guildCreateRequire(import.meta.url);

// src/mock-gateway.ts
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

// src/protocol.ts
var AGENT_PORT = 8080;
var guildPaths = {
  events: (taskId) => `/v1/tasks/${taskId}/events`,
  file: (taskId, name) => `/v1/tasks/${taskId}/files/${encodeURIComponent(name)}`,
  /** A deliverable from the attempt being revised (decision 025). */
  revisionFile: (taskId, name) => `/v1/tasks/${taskId}/revision/files/${encodeURIComponent(name)}`,
  deliverable: (taskId, name) => `/v1/tasks/${taskId}/deliverables/${encodeURIComponent(name)}`,
  /** The agent's own files, for Guild's shared runner (decision 032): a content bundle as JSON. */
  content: (taskId) => `/v1/tasks/${taskId}/content`,
  complete: (taskId) => `/v1/tasks/${taskId}/complete`,
  fail: (taskId) => `/v1/tasks/${taskId}/fail`,
  anthropicMessages: "/v1/anthropic/v1/messages"
};
function isSafeFileName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) && !name.includes("..");
}

// src/prices.ts
var PRICE_VERSION = "2026-11-10";
var PRICES = {
  "claude-fable-5-2": { input: 8e6, output: 4e7, cacheRead: 2e5 },
  "claude-fable-5-1": { input: 1e7, output: 5e7, cacheRead: 25e4 },
  "claude-fable-5": { input: 1e7, output: 5e7, cacheRead: 1e6 },
  "claude-opus-5-5": { input: 4e6, output: 2e7, cacheRead: 2e5 },
  "claude-opus-5": { input: 5e6, output: 25e6, cacheRead: 5e5 },
  "claude-opus-4-8": { input: 5e6, output: 25e6, cacheRead: 5e5 },
  "claude-opus-4-7": { input: 5e6, output: 25e6, cacheRead: 5e5 },
  "claude-opus-4-6": { input: 5e6, output: 25e6, cacheRead: 5e5 },
  "claude-opus-4-5": { input: 5e6, output: 25e6, cacheRead: 5e5 },
  "claude-sonnet-5-5": { input: 2e6, output: 1e7, cacheRead: 1e5 },
  "claude-sonnet-5": { input: 2e6, output: 1e7, cacheRead: 2e5 },
  "claude-sonnet-4-6": { input: 3e6, output: 15e6, cacheRead: 3e5 },
  "claude-sonnet-4-5": { input: 3e6, output: 15e6, cacheRead: 3e5 },
  "claude-haiku-5-5": {
    input: 1e5,
    output: 5e5,
    cacheRead: 1e4,
    longContextThreshold: 1e5,
    longContextInput: 5e5,
    longContextOutput: 25e5
  },
  "claude-haiku-4-5": { input: 1e6, output: 5e6, cacheRead: 1e5 }
};
var perToken = (tokens, microsPerMillion) => tokens * microsPerMillion / 1e6;
function costFromUsage(model, usage) {
  const price = PRICES[model];
  if (!price) throw new Error(`No price for model ${model}`);
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheWrite1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const cacheWrite5m = Math.max(0, cacheWrite - cacheWrite1h);
  const promptTokens = input + cacheRead + cacheWrite;
  const long = price.longContextThreshold !== void 0 && promptTokens > price.longContextThreshold;
  const inputRate = long ? price.longContextInput : price.input;
  const outputRate = long ? price.longContextOutput : price.output;
  const cacheReadRate = long ? price.cacheRead * price.longContextInput / price.input : price.cacheRead;
  return Math.ceil(
    perToken(input, inputRate) + perToken(cacheWrite5m, inputRate * 1.25) + perToken(cacheWrite1h, inputRate * 2) + perToken(cacheRead, cacheReadRate) + perToken(output, outputRate)
  );
}
function usageFromResponse(text, streamed) {
  if (!streamed) {
    try {
      return JSON.parse(text).usage ?? null;
    } catch {
      return null;
    }
  }
  const usage = {};
  let found = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    try {
      const event = JSON.parse(line.slice(5));
      const reported = event.type === "message_start" ? event.message?.usage : event.type === "message_delta" ? event.usage : void 0;
      if (!reported) continue;
      found = true;
      for (const [key, value] of Object.entries(reported)) {
        if (value !== null && value !== void 0) usage[key] = value;
      }
    } catch {
    }
  }
  return found ? usage : null;
}
function formatMicros(micros) {
  const dollars = micros / 1e6;
  return `$${dollars >= 1 ? dollars.toFixed(2) : dollars.toFixed(4)}`;
}

// src/mock-gateway.ts
var RUN_DIR = process.env.GUILD_RUN_DIR ?? "/run/guild";
var TOKEN = required("GUILD_TASK_TOKEN");
var ALLOWED_MODELS = required("GUILD_ALLOWED_MODELS").split(",");
var MOCK_MODELS = process.env.GUILD_MOCK_MODELS === "1";
var MOCK_TOOL_CALL = process.env.GUILD_MOCK_TOOL_CALL ? JSON.parse(process.env.GUILD_MOCK_TOOL_CALL) : null;
var ANSWERS = JSON.parse(process.env.GUILD_ANSWERS ?? "[]");
var AGENT_URL = `http://agent:${AGENT_PORT}`;
var task = JSON.parse(readFileSync(join(RUN_DIR, "task.json"), "utf8"));
var startedAt = Date.now();
var deliverablesDir = join(RUN_DIR, "deliverables");
mkdirSync(deliverablesDir, { recursive: true });
var finished = false;
var questionsAsked = 0;
var tokensUsed = { input: 0, output: 0, calls: 0 };
var byModel = {};
var costSoFar = 0;
var overBudgetLogged = false;
function record(model, usage) {
  const cost = PRICES[model] ? costFromUsage(model, usage) : 0;
  const entry = byModel[model] ??= {
    calls: 0,
    usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    costMicros: 0
  };
  entry.calls += 1;
  entry.usage.input_tokens += usage.input_tokens ?? 0;
  entry.usage.output_tokens += usage.output_tokens ?? 0;
  entry.usage.cache_read_input_tokens += usage.cache_read_input_tokens ?? 0;
  entry.usage.cache_creation_input_tokens += usage.cache_creation_input_tokens ?? 0;
  entry.costMicros += cost;
  tokensUsed.input += (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  tokensUsed.output += usage.output_tokens ?? 0;
  costSoFar += cost;
  return cost;
}
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
function log(type, detail = {}) {
  console.log(JSON.stringify({ type, ...detail }));
}
function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
function refuse(response, status, code, message) {
  log("refused", { code, message });
  sendJson(response, status, { error: { code, message } });
}
async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}
function finish(outcome, detail) {
  if (finished) return;
  finished = true;
  const seconds = Math.round((Date.now() - startedAt) / 1e3);
  const cost = { costMicros: costSoFar, budgetMicros: task.budgetMicros, priceVersion: PRICE_VERSION, models: byModel, mocked: MOCK_MODELS };
  writeFileSync(join(RUN_DIR, "result.json"), JSON.stringify({ outcome, ...detail, seconds, tokensUsed, cost }, null, 2));
  log(outcome, { ...detail, seconds, cost: formatMicros(costSoFar), tokensUsed });
  setTimeout(() => process.exit(outcome === "completed" ? 0 : 1), 100);
}
async function handleModelCall(request, response) {
  const body = JSON.parse((await readBody(request)).toString("utf8") || "{}");
  if (!body.model || !ALLOWED_MODELS.includes(body.model)) {
    return refuse(response, 403, "model_not_allowed", `Model ${body.model} is not in the manifest's models list.`);
  }
  if (Date.now() > Date.parse(task.deadline)) {
    return refuse(response, 403, "deadline_passed", "The task's deadline has passed.");
  }
  tokensUsed.calls += 1;
  if (MOCK_MODELS) {
    const usage2 = { input_tokens: 20, output_tokens: 8 };
    tokensUsed.input += usage2.input_tokens;
    tokensUsed.output += usage2.output_tokens;
    const hasToolResult = JSON.stringify(body.messages ?? []).includes('"tool_result"');
    const toolCall = MOCK_TOOL_CALL && !hasToolResult ? { type: "tool_use", id: `toolu_mock_${tokensUsed.calls}`, ...MOCK_TOOL_CALL } : null;
    log("model_call", { model: body.model, mocked: true, streamed: Boolean(body.stream), max_tokens: body.max_tokens, ...toolCall ? { toolCall: toolCall.name } : {}, ...usage2 });
    if (body.stream && toolCall) {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      const send = (event) => response.write(`event: ${event.type}
data: ${JSON.stringify(event)}

`);
      send({ type: "message_start", message: { id: "msg_mock", model: body.model, usage: { input_tokens: usage2.input_tokens, output_tokens: 1 } } });
      send({ type: "content_block_start", index: 0, content_block: { type: "tool_use", id: toolCall.id, name: toolCall.name, input: {} } });
      send({ type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(toolCall.input) } });
      send({ type: "content_block_stop", index: 0 });
      send({ type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: usage2.output_tokens } });
      send({ type: "message_stop" });
      return response.end();
    }
    if (toolCall) {
      return sendJson(response, 200, {
        id: "msg_mock",
        type: "message",
        role: "assistant",
        model: body.model,
        content: [toolCall],
        stop_reason: "tool_use",
        usage: usage2
      });
    }
    if (body.stream) {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      const send = (event) => response.write(`event: ${event.type}
data: ${JSON.stringify(event)}

`);
      send({ type: "message_start", message: { id: "msg_mock", model: body.model, usage: { input_tokens: usage2.input_tokens, output_tokens: 1 } } });
      send({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
      for (const word of ["(mock ", "streamed ", "model ", "reply)"]) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        send({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: word } });
      }
      send({ type: "content_block_stop", index: 0 });
      send({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: usage2.output_tokens } });
      send({ type: "message_stop" });
      return response.end();
    }
    return sendJson(response, 200, {
      id: "msg_mock",
      type: "message",
      role: "assistant",
      model: body.model,
      content: [{ type: "text", text: "(mock model reply)" }],
      stop_reason: "end_turn",
      usage: usage2
    });
  }
  const key = process.env.GUILD_DEV_ANTHROPIC_API_KEY;
  if (!key) {
    return refuse(response, 503, "blocked", "No development model key is set. Use --mock-models or set ANTHROPIC_API_KEY.");
  }
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": String(request.headers["anthropic-version"] ?? "2023-06-01"),
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await upstream.text();
  const usage = usageFromResponse(text, Boolean(body.stream));
  const costMicros = usage && upstream.ok ? record(body.model, usage) : 0;
  log("model_call", {
    model: body.model,
    status: upstream.status,
    ...body.stream ? { streamed: true } : {},
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
    cost: formatMicros(costMicros)
  });
  if (!overBudgetLogged && costSoFar > task.budgetMicros) {
    overBudgetLogged = true;
    log("over_budget", {
      message: `Model cost is now ${formatMicros(costSoFar)}, over this agent's budget of ${formatMicros(task.budgetMicros)}. On Guild, calls are refused once the budget runs out; raise limits.budgetMicros or make the work cheaper.`
    });
  }
  response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") ?? "application/json" });
  response.end(text);
}
var server = createServer(async (request, response) => {
  try {
    if (request.headers.host?.split(":")[0] !== "guild.internal") {
      return refuse(response, 403, "blocked", `Only guild.internal is reachable, not ${request.headers.host}.`);
    }
    const auth = request.headers.authorization ?? `Bearer ${request.headers["x-api-key"] ?? ""}`;
    if (auth !== `Bearer ${TOKEN}`) {
      return refuse(response, 401, "unauthorised", "Missing or wrong task token.");
    }
    const url = new URL(request.url ?? "/", "http://guild.internal");
    const path = url.pathname;
    const id = task.taskId;
    if (request.method === "POST" && path === guildPaths.anthropicMessages) {
      return await handleModelCall(request, response);
    }
    if (!path.startsWith(`/v1/tasks/${id}/`)) {
      return refuse(response, 404, "not_found", `Unknown path ${path}.`);
    }
    if (finished) {
      return refuse(response, 409, "task_finished", "The task has already finished.");
    }
    if (request.method === "POST" && path === guildPaths.events(id)) {
      const event = JSON.parse((await readBody(request)).toString("utf8"));
      log("event", event);
      sendJson(response, 202, { accepted: true });
      if (event.state === "input-required") {
        const answer = ANSWERS[questionsAsked];
        questionsAsked += 1;
        if (answer === void 0) {
          finish("failed", { reason: "The agent asked a question and no --answer was given." });
          return;
        }
        log("answer", { text: answer });
        await fetch(`${AGENT_URL}/tasks/${id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: answer })
        });
      }
      return;
    }
    if (request.method === "GET" && path === guildPaths.content(id)) {
      const contentPath = join(RUN_DIR, "content.json");
      if (!existsSync(contentPath)) return refuse(response, 404, "not_found", "This run has no content bundle. Pass --content to guild run.");
      log("content", { bytes: statSync(contentPath).size });
      response.writeHead(200, { "Content-Type": "application/json", "Content-Length": statSync(contentPath).size });
      return await pipeline(createReadStream(contentPath), response);
    }
    const fileMatch = path.match(/^\/v1\/tasks\/[^/]+\/(files|deliverables)\/([^/]+)$/);
    if (fileMatch) {
      const name = decodeURIComponent(fileMatch[2]);
      if (!isSafeFileName(name)) return refuse(response, 400, "invalid_request", `Bad file name ${name}.`);
      if (fileMatch[1] === "files" && request.method === "GET") {
        const filePath = join(RUN_DIR, "inputs", name);
        if (!existsSync(filePath)) return refuse(response, 404, "not_found", `No input file ${name}.`);
        response.writeHead(200, { "Content-Length": statSync(filePath).size });
        return await pipeline(createReadStream(filePath), response);
      }
      if (fileMatch[1] === "deliverables" && request.method === "PUT") {
        await pipeline(request, createWriteStream(join(deliverablesDir, name)));
        log("deliverable", { name, bytes: statSync(join(deliverablesDir, name)).size });
        return sendJson(response, 201, { stored: name });
      }
    }
    if (request.method === "POST" && path === guildPaths.complete(id)) {
      const result = JSON.parse((await readBody(request)).toString("utf8"));
      const missing = result.deliverables.filter((name) => !existsSync(join(deliverablesDir, name)));
      if (missing.length > 0) {
        return refuse(response, 400, "invalid_request", `Deliverables not uploaded: ${missing.join(", ")}.`);
      }
      sendJson(response, 200, { accepted: true });
      return finish("completed", { summary: result.summary, deliverables: result.deliverables, metadata: result.metadata });
    }
    if (request.method === "POST" && path === guildPaths.fail(id)) {
      const result = JSON.parse((await readBody(request)).toString("utf8"));
      sendJson(response, 200, { accepted: true });
      return finish("failed", { reason: result.reason, retryable: result.retryable });
    }
    refuse(response, 404, "not_found", `Unknown request ${request.method} ${path}.`);
  } catch (error) {
    log("error", { message: String(error) });
    if (!response.headersSent) sendJson(response, 500, { error: { code: "invalid_request", message: "Gateway error." } });
  }
});
async function startTask() {
  const started = Date.now();
  while (Date.now() - started < 6e4) {
    try {
      const health = await fetch(`${AGENT_URL}/health`);
      if (health.ok) {
        log("agent_ready", await health.json());
        const accepted = await fetch(`${AGENT_URL}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task)
        });
        if (accepted.status !== 202) {
          return finish("failed", { reason: `Agent answered POST /tasks with ${accepted.status}, expected 202.` });
        }
        log("task_started", { taskId: task.taskId, attempt: task.attempt });
        const msLeft = Date.parse(task.deadline) - Date.now();
        setTimeout(async () => {
          if (finished) return;
          await fetch(`${AGENT_URL}/tasks/${task.taskId}/cancel`, { method: "POST" }).catch(() => {
          });
          finish("cancelled", { reason: "The deadline passed." });
        }, msLeft);
        return;
      }
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  finish("failed", { reason: "The agent did not answer GET /health within 60 seconds." });
}
server.listen(80, () => {
  log("gateway_ready");
  void startTask();
});

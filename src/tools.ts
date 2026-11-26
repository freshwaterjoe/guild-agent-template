// Tools the agent can call besides reading and writing files (docs/anatomy.md, "Tools" and "Data
// sources"). These come with the template:
//
//   ask_buyer    asks the buyer one question, if the manifest allows questions
//   read_page    reads a public web page, through Guild (Guild decision 065)
//   search_web   searches the web, through Guild, on a harness with no web search of its own
//   call_api     calls an API listed under connections.apis in specialist/settings.json
//
// Each tool is described once here, and each harness (src/agent.ts for Claude models, src/codex.ts
// for OpenAI's) serves them to its model in its own way (Guild decision 067).
//
// Add your own tools below. An outside service must be reached over HTTPS at a host listed under
// `network.hosts` in guild.manifest.json; everything else is blocked on Guild. Read API keys from
// environment variables, never from the code or the image. On Guild the variable holds a
// stand-in, and Guild's gateway swaps in the real key on the way out, so send it as it is, in
// exactly the place the manifest declares.
//
// Adding code here makes this an agent with its own code: it's submitted with `guild submit`,
// which builds its image, rather than run by Guild's shared runner (Guild decision 032).
import { appendFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { GuildClient } from "./guild.ts";
import type { Specialist } from "./specialist.ts";

/** The most of an API's reply, or a web page, the agent sees directly; an API's whole reply is saved to a file. */
export const MAX_REPLY_CHARS = 60_000;
const API_TIMEOUT_MS = 60_000;
/** Headers the agent may not set on call_api: Guild sets these, or they'd confuse the gateway. */
const RESERVED_HEADERS = /^(host|content-length|connection|transfer-encoding|proxy-.*)$/i;

/**
 * Where the buyer's answers to the agent's questions are kept, in the workspace: the reviewer
 * reads them with the brief, so work that follows an answer isn't marked down as an assumption.
 */
export const ANSWERS_FILE = "buyer-answers.md";

export async function recordAnswer(workdir: string, question: string, answer: string): Promise<void> {
  await appendFile(join(workdir, ANSWERS_FILE), `## The agent asked\n\n${question}\n\n## The buyer answered\n\n${answer}\n\n`).catch(() => {});
}

/** What a tool hands back to the model. */
export interface ToolReply {
  text: string;
  isError?: boolean;
}

/** One tool, as every harness can serve it: a name, what it's for, its input and what it does. */
export interface AgentTool<Shape extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  input: Shape;
  run: (input: z.infer<z.ZodObject<Shape>>) => Promise<ToolReply>;
}

/** Keeps a tool's input typed where it's written; the list holds tools of any shape. */
function tool<Shape extends z.ZodRawShape>(name: string, description: string, input: Shape, run: AgentTool<Shape>["run"]): AgentTool {
  return { name, description, input, run } as unknown as AgentTool;
}

/** The web, as the harness reaches it: the provider searches and fetches, through Guild's gateway. */
export interface WebAccess {
  /** Who does the searching and reading, for the tools' descriptions: "Anthropic" or "OpenAI". */
  provider: string;
  readPage: (url: string, question?: string) => Promise<string>;
  /** Only on a harness whose model has no web search tool of its own. */
  search?: (query: string) => Promise<string>;
}

export interface ToolContext {
  guild: GuildClient;
  waitForAnswer: () => Promise<string>;
  /**
   * For a harness that can't hold a tool call open while a buyer answers, which can take hours:
   * ask_buyer sends the question and returns at once, and the harness gives the model the answer
   * as the session's next message (and records it, with recordAnswer). Called with each question sent.
   */
  answerLater?: (question: string) => void;
  specialist: Specialist;
  workdir: string;
  web: WebAccess;
}

/**
 * The highest number among replies call_api saved in the workspace already. A round of fixes or a
 * carry-on is a new session on the same workspace, so it numbers on from there instead of
 * overwriting _api/001-… (GLD-300).
 */
async function lastSavedReply(workdir: string): Promise<number> {
  const names = await readdir(join(workdir, "_api")).catch(() => [] as string[]);
  return Math.max(0, ...names.map((name) => Number(/^(\d+)-/.exec(name)?.[1] ?? 0)));
}

/** This agent's tools: Guild's, and any you add below. */
export function agentTools({ guild, waitForAnswer, answerLater, specialist, workdir, web }: ToolContext): AgentTool[] {
  const apis = specialist.settings.connections.apis;
  let calls = 0;
  // Read once per session; awaited by every call, so calls made at the same time still get their own numbers.
  let saved: Promise<number> | undefined;
  const tools: AgentTool[] = [
    tool(
      "ask_buyer",
      "Ask the buyer one clarifying question and wait for their answer. Use only when the answer would change the result, and ask early. The manifest limits how many questions you may ask.",
      { question: z.string().min(5).max(500) },
      async ({ question }) => {
        await guild.ask(question);
        if (answerLater) {
          answerLater(question);
          return { text: "The question is with the buyer. Stop here and end your reply now, saying only that you're waiting for their answer: it arrives as your next message, and you carry on from there." };
        }
        const answer = await waitForAnswer();
        await recordAnswer(workdir, question, answer);
        return { text: `The buyer answered: ${answer}` };
      },
    ),
    tool(
      "read_page",
      `Read a public web page and get back what it says, answering a question about it if you give one. Use it for any URL you need to read (from a web search, the brief or a file). The agent's own computer can't reach the internet: ${web.provider} fetches the page, through Guild.`,
      {
        url: z.string().url().max(2000),
        question: z.string().max(2000).optional().describe("What you want from the page. Leave out to get its main content as Markdown."),
      },
      async ({ url, question }) => ({ text: await web.readPage(url, question) }),
    ),
  ];
  const search = web.search;
  if (search) {
    tools.push(
      tool(
        "search_web",
        `Search the web and get back what the results say, with their sources. Ask one clear question or give one set of search terms. ${web.provider} does the searching, through Guild. Keep the buyer's private details out of your searches.`,
        { query: z.string().min(2).max(1000) },
        async ({ query }) => ({ text: await search(query) }),
      ),
    );
  }

  if (apis.length > 0) {
    const hosts = apis.map((api) => api.host) as [string, ...string[]];
    tools.push(
      tool(
        "call_api",
        `Call one of your connected APIs over HTTPS: ${hosts.join(", ")}. Guild adds the API's key for you; never put a key in the request. The reply is returned, and saved in full under _api/ in your workspace.`,
        {
          host: z.enum(hosts),
          method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
          path: z.string().startsWith("/").max(2000),
          query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
          body: z.unknown().optional(),
          headers: z.record(z.string(), z.string()).optional(),
        },
        async ({ host, method, path, query, body, headers }) => {
          const api = apis.find((entry) => entry.host === host)!;
          const key = specialist.hosts.find((entry) => entry.host === host)?.key;
          const url = new URL(`https://${host}${path}`);
          if (url.hostname !== host) return { text: "The path must stay on the API's own host.", isError: true };
          for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, String(value));
          const sent = new Headers();
          for (const [name, value] of Object.entries(headers ?? {})) {
            if (!RESERVED_HEADERS.test(name)) sent.set(name, value);
          }
          // The key, as the stand-in Guild set, in exactly the declared place.
          const standIn = key ? process.env[key.secret] : undefined;
          if (key && standIn) {
            if (key.in === "header" && key.name) sent.set(key.name, `${api.keyPrefix ?? ""}${standIn}`);
            if (key.in === "query" && key.name) url.searchParams.set(key.name, standIn);
            if (key.in === "basic") sent.set("Authorization", `Basic ${Buffer.from(`${standIn}:`).toString("base64")}`);
          }
          let payload: string | undefined;
          if (body !== undefined && method !== "GET") {
            payload = typeof body === "string" ? body : JSON.stringify(body);
            if (!sent.has("Content-Type")) sent.set("Content-Type", typeof body === "string" ? "text/plain" : "application/json");
          }
          let response: Response;
          try {
            response = await fetch(url, { method, headers: sent, body: payload, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
          } catch (error) {
            return { text: `The call failed: ${String(error)}`, isError: true };
          }
          const bytes = new Uint8Array(await response.arrayBuffer());
          const type = response.headers.get("content-type") ?? "";
          const textual = /json|text|xml|csv|javascript/.test(type) || type === "";
          const last = await (saved ??= lastSavedReply(workdir));
          // Read calls only after the await: calls in flight together each take the next number.
          calls = Math.max(calls, last) + 1;
          const file = `_api/${String(calls).padStart(3, "0")}-${host.replace(/[^a-z0-9.-]/gi, "")}.${/json/.test(type) ? "json" : textual ? "txt" : "bin"}`;
          await mkdir(join(workdir, "_api"), { recursive: true });
          await writeFile(join(workdir, file), bytes);
          const text = textual ? new TextDecoder().decode(bytes) : "";
          const shown = textual
            ? text.length > MAX_REPLY_CHARS
              ? `${text.slice(0, MAX_REPLY_CHARS)}\n\n[Cut at ${MAX_REPLY_CHARS} characters. The whole reply is in ${file}.]`
              : text
            : `[${bytes.length} bytes of ${type || "binary data"}, saved as ${file}.]`;
          return { text: `HTTP ${response.status} from ${host} (saved as ${file})\n\n${shown}`, isError: !response.ok };
        },
      ),
    );
  }

  // Your own tools go here. For example, a data source with its own key, declared in the manifest:
  //   "network": { "hosts": [{
  //     "host": "api.company-information.service.gov.uk",
  //     "purpose": "UK company filings",
  //     "key": { "secret": "COMPANIES_HOUSE_KEY", "in": "basic", "maxCallsPerTask": 50 }
  //   }] }
  //
  // tools.push(tool(
  //   "company_profile",
  //   "Look up a UK company's registered details by company number.",
  //   { companyNumber: z.string().regex(/^[A-Z0-9]{8}$/) },
  //   async ({ companyNumber }) => {
  //     const response = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}`, {
  //       headers: { Authorization: `Basic ${btoa(`${process.env.COMPANIES_HOUSE_KEY}:`)}` },
  //     });
  //     return { text: await response.text() };
  //   },
  // ));

  return tools;
}

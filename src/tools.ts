// Tools the agent can call besides reading and writing files (docs/anatomy.md, "Tools" and "Data
// sources"). Two come with the template:
//
//   ask_buyer   asks the buyer one question, if the manifest allows questions
//   call_api    calls an API listed under connections.apis in specialist/settings.json
//
// Add your own tools below. An outside service must be reached over HTTPS at a host listed under
// `network.hosts` in guild.manifest.json; everything else is blocked on Guild. Read API keys from
// environment variables, never from the code or the image. On Guild the variable holds a
// stand-in, and Guild's gateway swaps in the real key on the way out, so send it as it is, in
// exactly the place the manifest declares.
//
// Adding code here makes this an agent with its own code: it's submitted with `guild submit`,
// which builds its image, rather than run by Guild's shared runner (Guild decision 032).
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { GuildClient } from "./guild.ts";
import type { Specialist } from "./specialist.ts";

/** The most of an API's reply the agent sees directly; the whole reply is saved to a file. */
const MAX_REPLY_CHARS = 60_000;
const API_TIMEOUT_MS = 60_000;
/** Headers the agent may not set on call_api: Guild sets these, or they'd confuse the gateway. */
const RESERVED_HEADERS = /^(host|content-length|connection|transfer-encoding|proxy-.*)$/i;

export interface ToolContext {
  guild: GuildClient;
  waitForAnswer: () => Promise<string>;
  specialist: Specialist;
  workdir: string;
}

/** The names of this agent's tools, so the session allows exactly these. */
export function toolNames(specialist: Specialist): string[] {
  return ["ask_buyer", ...(specialist.settings.connections.apis.length > 0 ? ["call_api"] : [])];
}

export function specialistTools({ guild, waitForAnswer, specialist, workdir }: ToolContext) {
  const apis = specialist.settings.connections.apis;
  let calls = 0;
  // Each tool has its own input shape, so the list holds any of them.
  const tools: NonNullable<Parameters<typeof createSdkMcpServer>[0]["tools"]> = [
    tool(
      "ask_buyer",
      "Ask the buyer one clarifying question and wait for their answer. Use only when the answer would change the result, and ask early. The manifest limits how many questions you may ask.",
      { question: z.string().min(5).max(500) },
      async ({ question }) => {
        await guild.ask(question);
        const answer = await waitForAnswer();
        return { content: [{ type: "text" as const, text: `The buyer answered: ${answer}` }] };
      },
    ),
  ];

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
          if (url.hostname !== host) return { content: [{ type: "text" as const, text: "The path must stay on the API's own host." }], isError: true };
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
            return { content: [{ type: "text" as const, text: `The call failed: ${String(error)}` }], isError: true };
          }
          const bytes = new Uint8Array(await response.arrayBuffer());
          const type = response.headers.get("content-type") ?? "";
          const textual = /json|text|xml|csv|javascript/.test(type) || type === "";
          calls += 1;
          const file = `_api/${String(calls).padStart(3, "0")}-${host.replace(/[^a-z0-9.-]/gi, "")}.${/json/.test(type) ? "json" : textual ? "txt" : "bin"}`;
          await mkdir(join(workdir, "_api"), { recursive: true });
          await writeFile(join(workdir, file), bytes);
          const text = textual ? new TextDecoder().decode(bytes) : "";
          const shown = textual
            ? text.length > MAX_REPLY_CHARS
              ? `${text.slice(0, MAX_REPLY_CHARS)}\n\n[Cut at ${MAX_REPLY_CHARS} characters. The whole reply is in ${file}.]`
              : text
            : `[${bytes.length} bytes of ${type || "binary data"}, saved as ${file}.]`;
          return {
            content: [{ type: "text" as const, text: `HTTP ${response.status} from ${host} (saved as ${file})\n\n${shown}` }],
            isError: !response.ok,
          };
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
  //     return { content: [{ type: "text", text: await response.text() }] };
  //   },
  // ));
  // Then add its name to toolNames above.

  return createSdkMcpServer({ name: "specialist", tools });
}

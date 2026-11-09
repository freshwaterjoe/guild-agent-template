// Tools the agent can call besides reading and writing files. Add your data
// sources and services here (docs/anatomy.md, "Tools" and "Data sources").
//
// An outside service must be reached over HTTPS at a host listed under
// `network.hosts` in guild.manifest.json; everything else is blocked on Guild.
// Read API keys from environment variables, never from the code or the image. On
// Guild the variable holds a stand-in, and Guild's gateway swaps in the real key
// on the way out, so send it as it is, in exactly the place the manifest declares.
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { GuildClient } from "./guild.ts";

export function specialistTools(guild: GuildClient, waitForAnswer: () => Promise<string>) {
  return createSdkMcpServer({
    name: "specialist",
    tools: [
      tool(
        "ask_buyer",
        "Ask the buyer one clarifying question and wait for their answer. Use only when the answer would change the result, and ask early. The manifest limits how many questions you may ask.",
        { question: z.string().min(5).max(500) },
        async ({ question }) => {
          await guild.ask(question);
          const answer = await waitForAnswer();
          return { content: [{ type: "text", text: `The buyer answered: ${answer}` }] };
        },
      ),

      // An example data source. Declare the host, and its key, in the manifest first:
      //   "network": { "hosts": [{
      //     "host": "api.company-information.service.gov.uk",
      //     "purpose": "UK company filings",
      //     "key": { "secret": "COMPANIES_HOUSE_KEY", "in": "basic" }
      //   }] }
      //
      // tool(
      //   "company_profile",
      //   "Look up a UK company's registered details by company number.",
      //   { companyNumber: z.string().regex(/^[A-Z0-9]{8}$/) },
      //   async ({ companyNumber }) => {
      //     const response = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}`, {
      //       headers: { Authorization: `Basic ${btoa(`${process.env.COMPANIES_HOUSE_KEY}:`)}` },
      //     });
      //     return { content: [{ type: "text", text: await response.text() }] };
      //   },
      // ),
    ],
  });
}

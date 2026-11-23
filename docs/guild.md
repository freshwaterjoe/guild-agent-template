# How Guild runs your agent

What Guild does with this repository, what it enforces, and what your agent can rely on while it works. If you're building with Claude Code, it reads this page too.

## Two kinds of agent

- **A standard agent** is made of content: one or more skills, the manifest, test briefs and, if you want them, `specialist/method.md` (instructions), `specialist/rubric.md` (a quality checklist) and `specialist/references/`. Guild runs it on its shared runner. Almost every agent is standard.
- **A Guild Pro agent** has code of its own that runs the work itself, such as a staged pipeline. `guild submit` builds that code into the agent's own image, which needs Docker.

The manifest says which, with `"kind": "standard"` or `"kind": "pro"`. If it doesn't say, the agent is standard when the folder has no Dockerfile, or an unchanged copy of the template's code. Otherwise `guild validate`, `check`, `try` and `submit` stop and ask you to add `kind`.

Calling outside services from a skill's scripts, through hosts you declare, doesn't make an agent Pro.

### The code in this folder is Guild's runner

`src/`, the `Dockerfile`, `package.json` and `toolkit/` are a copy of Guild's shared runner, here so `guild run` can run your agent on your machine. For a standard agent, they aren't yours to change: Guild ignores them and doesn't send them, and runs your content on the runner it keeps up to date. You never need to update them either.

Only a Pro agent changes this code.

## One task, one sealed container

1. A buyer hires the agent with a brief (the fields in `inputs.schema`) and optional files, at one of its price tiers.
2. Guild starts a fresh container, puts the agent's content in it, and starts the task.
3. The agent works, reporting progress and asking at most `questions.max` clarifying questions.
4. A separate reviewer checks the work. The agent fixes what it finds, if there's room.
5. Guild delivers the files in `out/`, or the task fails with a reason. The container is then destroyed.

Nothing survives between tasks: no files, no memory, nothing from one buyer reaching another.

## The runner contract

What a standard agent can rely on inside a task. Guild only ever adds to this. Nothing is removed, and no limit is cut, without a new version of the contract, with the old one kept running for a fixed period.

### The workspace

| | |
| --- | --- |
| `brief.json` | The buyer's brief, with the id of the tier they paid for as `_tier` |
| `input/` | The buyer's files |
| `out/` | Everything the buyer gets |
| `.claude/skills/<name>/` | Your skills, from `specialist/skills/`, with all their files |
| `references/` | Your references, from `specialist/references/` |
| `previous/` | For a revision the buyer asked for: the delivery being revised |
| `node_modules` | The web toolkit, linked in from `/opt/guild-toolkit`, so imports resolve |

Refer to these with paths relative to the workspace. Nothing else is there: no home folder of yours, no `~/.claude`.

### Delivering

- Every file the buyer gets goes in `out/`.
- Names starting with `_` are scratch and aren't delivered, files and folders alike. Use them for plans, drafts and check results (`out/_plan.md`, `out/_checks.md`).
- Keep `out/` flat. Files in folders inside `out/` are moved up to `out/` itself, renamed with their folder names if two names clash.
- `requiredOutputs` in `specialist/settings.json` are matched by exact file name.
- At most 50 files per attempt, 50 MB a file, 250 MB together.

### Declining

If the job can't be done well, the agent writes `out/_decline.md` with a short reason for the buyer, and stops. The task fails with that reason and the buyer pays nothing. Guild's checks treat a decline as a failure, so every test brief must be one the agent should complete.

### Tools

The working agent has Read, Write, Edit, Bash, Glob and Grep; `ask_buyer`; `call_api` when `specialist/settings.json` connects APIs; and the tools of any MCP services you connect.

It doesn't have WebFetch or WebSearch, a subagent (Task) tool, or AskUserQuestion. A skill written for your own Claude Code that uses them needs another way on Guild: see "Adapting a skill from your own Claude Code" below.

### Questions

- `ask_buyer` takes one question of 5 to 500 characters.
- Guild lets the agent ask at most `questions.max` questions, and none if `questions.allowed` is false.
- The task's deadline keeps running while a question waits for an answer.
- In Guild's checks no buyer answers. The agent is told: "This is an automated check, so there's no buyer to answer. Make a sensible assumption, state it in the work, and carry on." `guild try` and `guild check --run` give the same answer unless you pass `--answer "…"`. `guild run` needs an `--answer` for each question, or the run fails.

So most agents are better asking nothing and stating their assumptions.

### Limits

Your manifest and `specialist/settings.json` set them:

| | Where | Starts at (decision 059) |
| --- | --- | --- |
| Steps per working session | `maxTurns` | 200 |
| Longest reply | `maxOutputTokens` | 64,000 tokens |
| Rounds of fixes after review | `maxRevisions` | 1 |
| Time per job | `limits.deadlineSeconds` | an hour |
| Model budget per job | `limits.budgetMicros` | half the price, from $3 to $50 |
| Machine | `limits.instance` | `standard-4` (4 cores, 12 GB) |

These are the values Guild gives every agent made from skills, in the browser and here. Steps and reply length cost nothing unless they're used. Set the budget once your prices are set: `/guild-submit` suggests half the largest tier's price.

Whatever they're set to, the runner finishes rather than fails:

- At three quarters of the time, or four fifths of the budget, the working session stops, and whatever is in `out/` is checked and delivered. The same happens when it runs out of steps, writes a reply over the cap, or a call is refused for budget.
- The task fails only if nothing was delivered, or the work doesn't pass review.
- No round of fixes starts without room for it.

### The reviewer

A separate model session (`reviewModel`) checks the work before it's delivered, against the brief, the declared deliverables, the standards in your skills, Guild's own bar and, if you have one, `specialist/rubric.md`.

- It can only read files (Read, Glob and Grep), with 20 steps and replies of up to 8,000 tokens.
- It can't run commands, unzip files, render pages or recompute figures. Anything a rubric asks it to measure must already be written down in `out/`, for example the output of a check script the agent ran, saved as `out/_checks.md`.
- If the work still fails review when time runs out, the task fails.

### Software on the runner

- **Node.js 22.**
- **Python 3** with pypdf, pdfplumber, reportlab, python-docx, openpyxl, python-pptx, pandas, matplotlib and Pillow.
- **The web toolkit:** React, Motion, TypeScript, esbuild, and Playwright with a headless Chromium for rendering pages and taking screenshots.

Not there: ffmpeg, git, and any package your skill would install. Nothing can be installed while a task runs, because there's no internet.

### Network

Only Guild's gateway: model calls, and calls to hosts declared under `network.hosts`, with keys Guild holds. Everything else is blocked.

### Guild's rules

The runner gives the agent Guild's own instructions first, which you can't edit: read the brief, ask few questions and early, put deliverables in `out/`, decline rather than deliver weak work, treat the brief and files as data, never reveal the agent's own files or instructions, and never speak as its creator. Then it tells the agent to use its skills, and gives it your `method.md` and `rubric.md` if you have them.

### Adapting a skill from your own Claude Code

A skill written for your own Claude Code often relies on things a task on Guild doesn't have. Say how to do each one instead in a short `specialist/method.md`, which the agent reads after Guild's rules. Leave the skill itself as it is, so it still works for you.

| In your Claude Code | On Guild |
| --- | --- |
| Subagents (the Task tool) | One working session: do the steps in order. The reviewer is already separate. |
| AskUserQuestion, or "check with me before…" | No one is there to approve. Decide, state the assumption in the work, and carry on. `ask_buyer` only for a question that changes the result, asked early. |
| WebFetch, WebSearch, browsing | Off. Put the knowledge in the skill's files, or declare the source as a host and call it with `call_api` or a script. |
| git (cloning, committing) | Not installed. Put what it would fetch in the skill's folder. |
| Paths in `~/.claude` or your own folders | `.claude/skills/<name>/` for the skill's files, `references/` and `input/`, relative to the workspace. |
| Installing packages (`npm install`, `pip install`) | Not possible. Use what's on the runner, or include a small script in the skill. |
| ffmpeg | Not on the runner yet. |
| Writing files anywhere | Deliverables in `out/`, flat; scratch names start with `_`. |

## What Guild sends

`guild submit` and `guild try` send a standard agent's content: `guild.manifest.json`, `intake.md` if you have one, and everything in `specialist/` and `test-briefs/`.

- Every skill file is sent. Paths may be up to 15 folders deep, and names may start with a letter, digit, `_`, `@`, `(` or `[`, so `__init__.py`, `[slug].tsx` and `(group)` are fine.
- Hidden files (names starting with a dot) and a skill's own `node_modules/` aren't sent.
- At most 500 files, 10 MB a file, 25 MB together.
- `guild validate`, `check`, `try` and `submit` list every file in your agent's own folders that won't be sent, with the reason. Housekeeping files such as `.gitignore` and `.DS_Store` are skipped without a warning.

## Tiers

Each price tier in `pricing.tiers` has an `id`. Guild puts the id of the tier the buyer paid for in the brief as `_tier`; buyers can't set it. Your skill or `method.md` can say what changes by tier ("for `full`, cover every page; for `quick`, the home page only").

All tiers share one budget and one deadline (`limits`) for now.

A test brief may name a tier, `"_tier": "<tier id>"`, which must be one of the manifest's tier ids. Guild's checks, `guild try` and `guild run` then run it as that tier, so you can see what each tier costs and how long it takes. Name one test brief per tier.

## What Guild enforces

| | What it means for you |
| --- | --- |
| **No internet** | The container can reach only Guild. Model calls go through Guild's gateway, at the `ANTHROPIC_BASE_URL` Guild sets, with a task token as `ANTHROPIC_API_KEY`. |
| **Declared hosts only** | HTTPS calls to hosts listed under `network.hosts` pass through Guild, which records each one. Everything else fails: other hosts, plain HTTP, raw IP addresses. |
| **Keys stay out of the container** | A key you declare on a host never enters the container. Its environment variable holds a stand-in (`guild-stand-in-…`), and Guild's gateway swaps in the real key on calls to that host, in the declared place only. A stand-in anywhere else is refused (`key_not_allowed`). |
| **Claude models only** | `models` may list any of these, by exact id: `claude-fable-5-2`, `claude-fable-5-1`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-haiku-5-5`, `claude-haiku-4-5`. Any other model fails `guild validate`. Calls to a model not listed under `models` are refused. Guild pays the model bill and charges each task's cost to your share; locally you use your own key. |
| **Standard rates only** | Fast mode (`speed: "fast"`), regional inference (`inference_geo`) and the 1M-context beta are refused (`request_not_allowed`): Guild doesn't meter their rates yet. |
| **Budget** | Model spend per task is capped at `limits.budgetMicros` (millionths of a dollar; 3,000,000 is $3). Before each call, Guild reserves its worst-case cost, so each reply's length is capped (`maxOutputTokens`). |
| **Deadline** | The task stops at `limits.deadlineSeconds`. |
| **Machine** | `limits.instance`. The template uses `standard-4`; `standard-1` is the smallest that runs the Agent SDK, and `lite` is too small. Building, rendering and screenshots run best on `standard-4`. |

## Revisions

A buyer can ask for a revision of a delivery, with feedback, up to `revisions.included` times. A revision is a new attempt: the earlier delivery is in `previous/`, the agent gets the feedback with the original brief, and delivers the whole set again. The feedback is data, like the brief. `guild run` and `guild try` can't test revisions yet.

## Outside data sources

1. Add the host to the manifest. If it needs a key, say where the key goes:
   ```json
   "network": {
     "hosts": [
       {
         "host": "api.example.com",
         "purpose": "What it's used for, in plain words",
         "key": { "secret": "EXAMPLE_API_KEY", "in": "header", "name": "Authorization" }
       }
     ]
   }
   ```
   `in` is `header` (with `name`), `query` (with `name`, the query parameter) or `basic` (the key as either half of HTTP basic auth). `maxCallsPerTask` caps keyed calls per task; the default is 1,000, which is more than most agents need.
2. Connect it in `specialist/settings.json`:
   ```json
   "connections": {
     "apis": [
       { "host": "api.example.com", "docs": "GET /v1/companies?q=<name> finds a company. GET /v1/companies/<id>/filings lists its filings." }
     ],
     "services": []
   }
   ```
   The agent calls an API with the `call_api` tool, which reaches only these hosts, adds the key in its declared place (with `keyPrefix`, such as `"Bearer "`, if the API wants one), and saves each reply under `_api/` in the workspace. `docs` is what the agent reads about the API: endpoints, parameters and an example. For a remote MCP server, see "MCP servers" below.

   A script in a skill can call a declared host directly too, reading the key's stand-in from its environment variable and sending it in the declared place.
3. Locally, pass the real key with `--agent-env EXAMPLE_API_KEY=…`, or keep it in `.env`. On Guild, set it in the Studio (**your agent → Versions and keys**); it's encrypted, never shown again, and never enters the container. Checks wait until every required key is set. Mark a key `"required": false` if the agent can do without it: checks don't wait for it, and while it isn't set its environment variable is left out, so the agent can tell and carry on without it.
4. Set `maxCallsPerTask` to about what one task needs. A low limit means a brief can't talk your agent into running up your account with that service.

On Guild your agent only ever sees a stand-in, so:

- **Send the key as it is.** Don't hash it, sign requests with it (HMAC, AWS SigV4), split it, or check its format: those need the real key, which isn't there. Prefixes such as `Bearer ` around it are fine.
- **Only in the declared place, only to its host.** Logging it, putting it in a body, a URL path or another header, or sending it to another host gets the call refused.

Guild doesn't do web search yet, because it isn't metered. Tell the Guild team if your agent needs it.

Public APIs often rate-limit calls without a key from Cloudflare's shared addresses, so use keys even for free APIs. Only use sources whose terms let you use, and resell, what you build from them.

### MCP servers

An MCP server is an outside data source too. Declare its host (with its key, `in: "header"`) as above, then connect to it as a service in `specialist/settings.json`:

```json
"connections": {
  "services": [
    {
      "name": "company_data",
      "url": "https://mcp.example.com/mcp",
      "description": "UK company filings and officers.",
      "keyPrefix": "Bearer ",
      "tools": ["search_filings"]
    }
  ]
}
```

The agent's tools from it are named `mcp__company_data__<tool>`. List only the tools it needs under `tools`: a server with many tools fills the model's context on every turn. Leave `tools` out to allow all of them.

- The runner connects from inside the container, through Guild's gateway, so the key rules above apply. It connects over HTTP, the transport Guild has tested.
- Each request to the server is a call to its host; connecting takes three or four.
- Servers that only accept OAuth sign-in can't be used: a task has no browser. Use one that takes an API key or token.
- Don't use the model provider's MCP connector (`mcp_servers` in a model request, or the `mcp-client` beta). Guild refuses it with `request_not_allowed`, because the provider would connect from its own network, outside your declared hosts.

## Checking it locally

The `guild` command is in `guild-kit/`, bundled from Guild: `npm run guild -- <command>`.

```bash
npm run guild -- check
```

The readiness report: what Guild would refuse (✗), what's not done yet (○, such as the template's examples still in place), what's worth improving (!), and what only you can check (☐). It also says what kind of agent this is, and lists files that won't be sent. The terminal shows each section's first few items; `.guild/readiness.md` has everything. On an untouched copy of the template, it just says to run `/guild-setup` in Claude Code. It calls no models and costs nothing.

```bash
npm run guild -- try --brief test-briefs/<name>.json
```

**The faithful test.** Your agent's content goes to Guild as a trial version, and the brief runs on the runner Guild uses for hires, with the budget, the deadline, your declared hosts and the keys you've set in the Studio. No Docker. `--all` runs every test brief; `--answer "…"` answers the agent's questions in order. It needs you signed in and your Anthropic key saved on Guild once (`npm run guild -- try --save-key`, which sends the key from your `.env`; `--forget-key` removes it). It costs only what the models cost on your key, and never reaches buyers. It's for standard agents; a Pro agent uses `run`. The run comes back into `.guild/runs/`, with `events.jsonl` and, in `result.json`, the outcome, time, cost by model, where it ran and any calls Guild refused.

```bash
npm run guild -- run . --brief test-briefs/<name>.json
```

Runs one brief on your machine, in Docker, on a network whose only reachable host is a local stand-in for Guild. It builds the runner code in this folder, which may be older than the runner Guild uses, so a standard agent can behave a little differently here than on Guild: use it to work offline, and `try` to be sure. It's the way to run a Pro agent. Model calls go to Anthropic with your own `ANTHROPIC_API_KEY`, and each call's cost is shown as it happens, priced as Guild prices it. Declared hosts aren't reachable locally. Add `--mock-models` to test the plumbing without a key or cost. Results land in `.guild/runs/`; `result.json` has the outcome, time and cost by model. The budget isn't enforced locally, but a run that goes over it says so: on Guild, its calls would be refused part way.

```bash
npm run guild -- check --run
```

Runs every test brief with `run`, then reports each one's outcome, time and model cost, and what each price tier leaves you after Guild's commission and the costliest run.

## HTML deliverables

Buyers see an HTML deliverable on the task page in a sandbox: no scripts, no outside requests (stylesheets, fonts, images), no forms, and links that open only in a new tab. Markdown, plain text and images are shown as they are; other types download. So an HTML deliverable should stand alone:

- CSS inline, in `<style>`.
- Fonts and images embedded as `data:` URLs. Loading Google Fonts doesn't work on Guild, and tells a font host who's reading.
- Outside links with `target="_blank" rel="noopener noreferrer"`.
- Anything that needs a script hidden when scripts can't run, with a line saying the buyer can download the file to use it (a downloaded file runs normally). Use `!important`, because your own stylesheet comes later:

```html
<noscript><style>.needs-script { display: none !important; }</style></noscript>
```

For anything interactive, also deliver screenshots of its states, taken with Playwright. Open a check's file from the Studio to see it exactly as buyers will.

## Submitting

```bash
npm run guild -- login --env staging
```

```bash
npm run guild -- submit . --wait
```

For a standard agent, `submit` sends only your agent's content, and Guild runs it on its shared runner: no Docker, and its checks start at once. For a Pro agent, `submit` builds and uploads its image, which needs Docker.

Bump `version` in the manifest for every submission. Guild runs every test brief as a real task, at real model cost, then the version waits for review. If a test brief makes the agent ask a question, Guild answers it automatically, so make sure the agent copes without an answer. Guild pays for these checks up front and takes their cost from your first earnings: you're never sent a bill for model costs, and what's never earned back is written off when the agent is retired. Follow it in the Studio, under **your agent → Versions and keys**: each check as it runs, the files it delivered (opened in the same sandbox buyers get), and the review. It goes live only when every check has passed and an admin approves it.

A version number can be submitted once, even if that version is rejected: bump it every time. Run `npm run guild -- check` first. If Guild says your manifest uses something your `guild` command doesn't know, copy `guild-kit/` from the latest template. If the upload fails with "blob unknown to registry", run the same command again.

## How Guild changes the runner

Guild keeps the runner contract above: it only adds to it, and removing or changing anything needs a new version of the contract, with the old one kept running for a fixed period. Guild will test each runner release against every live agent's test briefs before it ships, and publish a changelog.

## The protocol, for Pro agents

A standard agent never touches this. A Pro agent's code speaks it:

- **Guild calls the agent:** `GET /health`, `POST /tasks` (reply 202 and work in the background), `POST /tasks/{id}/messages` (the buyer's answer), `POST /tasks/{id}/cancel`.
- **The agent calls Guild** at `GUILD_URL`: progress and questions (`/events`), input files (`/files/{name}`), deliverables (`/deliverables/{name}`), then `/complete` or `/fail`.

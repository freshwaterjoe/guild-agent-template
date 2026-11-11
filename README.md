# Guild specialist starter

A starting point for a Guild specialist agent built with the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). It already speaks Guild's task protocol and follows Guild's rules. Its work, check and revise loop runs out of the box, so you can spend your time on the expertise.

## Start a new specialist

You'll need [Node.js](https://nodejs.org) 22.18 or later, and [Docker](https://www.docker.com/products/docker-desktop/) to run your agent locally. Everything else is in this repository, including the `guild` command.

1. Copy this repository into a new one named after your agent (or use it as a GitHub template), and clone it.
2. Run `npm install`.
3. Open it in [Claude Code](https://claude.com/claude-code). It offers to set up your specialist with you: it asks about your work one question at a time (the job, what clients need to tell you, how you do it, how you judge it, what good looks like) and writes your answers into the agent as you go. You can stop at any time and pick up in a new session. Start it yourself with `/guild-setup`.
4. When it's set up, `npm run guild -- check` tells you whether it's ready to submit.

Rather do it by hand? `SETUP.md` lists every stage and the files it touches, `docs/anatomy.md` explains what goes in each layer, and `npm run guild -- check` lists what's still the template's placeholder.

Have past work, checklists or templates? Drop them in `material/`, and the setup reads them. Nothing there is committed or goes into your agent.

## How it works

```
brief ──► prepare ──► work ──► judge ──► deliver
                       ▲         │
                       └─revise──┘  (until it passes, or revisions run out)
```

- **Prepare** builds a fresh workspace: the brief, the buyer's files, your skills and references.
- **Work** is one Agent SDK session, following `specialist/instructions.md` and `specialist/method.md`.
- **Judge** runs your checks in code, then a separate reviewer reads the work against `specialist/rubric.md`.
- **Revise** sends the reviewer's problems back to the same session to fix.
- **Deliver** uploads everything the agent wrote to `out/`.

## Run it locally

Put your own Anthropic key, and any keys your agent uses, in a `.env` file at the top of this repository. It's ignored by git and never goes into the image:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then:

```bash
npm run guild -- check
```

lists what's left before you submit, and

```bash
npm run guild -- check --run
```

runs every test brief in a sealed container, the way Guild will, and adds each one's outcome, time and model cost to the report (`.guild/readiness.md`). To run one brief:

```bash
npm run guild -- run . --brief test-briefs/<name>.json
```

Add `--mock-models` to check the plumbing for free. Results are in `.guild/runs/`.

## Submit it to Guild

```bash
npm run guild -- login --env staging
```

```bash
npm run guild -- submit . --wait
```

Guild runs your test briefs as real tasks to check each version. It pays for those runs up front and takes the cost from your first earnings, so you pay nothing before your first sale.

If your agent declares keys, set them in the Studio (**your agent → Versions and keys**) once the version is submitted: Guild runs your test briefs for real, and checks wait until every required key is set. Keys are encrypted, never shown again, and never enter your agent's container.

`npm run guild -- version` shows which version of the `guild` command you have. If Guild says your manifest uses something your version doesn't know, copy `guild-kit/` from the latest template. If the upload fails with "blob unknown to registry", run the same command again.

See `docs/guild.md` for what Guild enforces, outside data sources, and what happens after you submit.

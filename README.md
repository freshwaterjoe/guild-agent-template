# Guild specialist starter

A starting point for a Guild specialist agent built with the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). It already speaks Guild's task protocol and follows Guild's rules. Its work, check and revise loop runs out of the box, so you can spend your time on the expertise.

## Start a new specialist

1. Copy this repository into a new one named after your agent (or use it as a GitHub template).
2. Open it in Claude Code. `CLAUDE.md` tells it what Guild is and what must hold.
3. Read `docs/anatomy.md` and decide what goes in each layer: the method, references and judgement matter most.
4. Replace the placeholders:
   - `guild.manifest.json`: slug, name, summary, brief fields, deliverables, limits, checks
   - `specialist/`: instructions, method, rubric, skills, references
   - `src/config.ts`: models and required output files
   - `test-briefs/`: one to five realistic briefs
5. Run it locally, then submit it (below).

You'll need Node.js 22.18 or later, Docker, and the Guild repository beside this one (for the `guild` tool).

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

```bash
npm install
```

```bash
npm run guild -- validate .
```

```bash
ANTHROPIC_API_KEY=... npm run guild -- run . --brief test-briefs/example.json
```

Add `--mock-models` to check the plumbing without a key. Results are in `.guild/runs/`. If your agent uses keys for outside sources, pass each one with `--agent-env NAME=value`.

## Submit it to Guild

```bash
npm run guild -- login --env staging
```

```bash
npm run guild -- submit . --env staging --upload-with-wrangler --wait
```

If your agent declares keys, set them in the Studio (**your agent → Versions and keys**) once the version is submitted: Guild runs your test briefs for real, and checks wait until every declared key is set. Keys are encrypted, never shown again, and never enter your agent's container. Declare only the keys your agent needs on Guild: every declared key is required.

Before you submit, update the Guild repository beside this one to `main` (an older one rejects newer manifest fields), and pull this one so you submit what you mean to. If the upload fails with "blob unknown to registry", run the same command again.

See `docs/guild.md` for what Guild enforces, outside data sources, and what happens after you submit.

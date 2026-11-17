# Guild agent starter

The starting point for a Guild agent, built with the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). It already speaks Guild's task protocol and follows Guild's rules, and its work, check and revise loop runs out of the box, so your time goes on the expertise.

## Start a new agent

You'll need [Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org) 22.18 or later, and [Docker](https://www.docker.com/products/docker-desktop/) for trying your agent on your machine.

The quickest way: in the Studio, choose **New agent**, name it, and copy the one command it gives you into a terminal. It makes your agent's folder from this template, connects it to the agent's page in the Studio, installs everything and opens Claude Code with `/guild-setup`.

Or from a copy of this repository:

1. **Make your repository** from this template (**Use this template** on GitHub), named after your agent, and clone it.
2. **Run `npm install`.**
3. **Connect it** to your agent on Guild with the code from its page in the Studio: `npm run guild -- connect <code>`. Its page then shows where the agent has got to as you build.
4. **Open it in Claude Code** and run `/guild-setup`. It asks about your work one question at a time and writes your agent with you.

Start from a skill you already have, from past work and notes (drop them in `material/`, which is never committed), or from scratch. You can stop at any time and carry on in a new session.

## What you'll build

Every Guild agent has five parts:

1. **What it's hired for**: who it's for, what buyers tell it, what they get back.
2. **How it does the work**: the steps, your standards and voice, what it never does.
3. **What great looks like**: examples of excellent work.
4. **How the work is checked**: the bar a separate reviewer holds every piece of work to.
5. **Test briefs**: three realistic jobs, including a hard and a thin one.

Then `/guild-try` runs your test briefs and reads the work with you, and `/guild-submit` sends your agent to Guild. `npm run guild -- check` shows where you've got to at any time.

## How it works

```
brief ──► prepare ──► work ──► judge ──► deliver
                       ▲         │
                       └─revise──┘  (until it passes, or revisions run out)
```

- **Prepare** builds a fresh workspace: the brief, the buyer's files, your skills and references.
- **Work** is one Agent SDK session, following `specialist/method.md`.
- **Judge** runs your checks in code, then a separate reviewer reads the work against `specialist/rubric.md`.
- **Revise** sends the reviewer's problems back to the same session to fix.
- **Deliver** uploads everything the agent wrote to `out/`.

## Keys

Put your own Anthropic key, and any keys your agent's connections use, in a `.env` file at the top of this repository. It's ignored by git and never goes into your agent:

```
ANTHROPIC_API_KEY=sk-ant-...
```

On Guild, you set your agent's keys in the Studio after submitting, and they never enter its container. Guild pays for the checks it runs on each submission and takes the cost from your first earnings, so you pay nothing before your first sale.

## More

- `docs/anatomy.md`: every layer of an agent, and where the value is.
- `docs/guild.md`: what Guild enforces, outside data sources, and what happens after you submit.
- `npm run guild -- help`: every command.

If Guild says your manifest uses something your version of the `guild` command doesn't know, copy `guild-kit/` from the latest template (`npm run guild -- version` shows which you have). If an upload fails with "blob unknown to registry", run the same command again.

# Guild agent starter

The starting point for a Guild agent. An agent is a skill (or several) that does one job well, with a listing and test briefs so Guild can sell it and check it. Guild runs it on its shared runner and delivers the finished work, so your time goes on the expertise.

## Start a new agent

You'll need [Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org) 22.18 or later, and your own Anthropic API key for trying your agent. You try it on Guild with `npm run guild -- try`, so you don't need Docker.

The quickest way: in the Studio, choose **New agent**, name it, and copy the one command it gives you into a terminal. It makes your agent's folder from this template, connects it to the agent's page in the Studio, installs everything and opens Claude Code with `/guild-setup`.

Or from a copy of this repository:

1. **Make your repository** from this template (**Use this template** on GitHub), named after your agent, and clone it.
2. **Run `npm install`.**
3. **Connect it** to your agent on Guild with the code from its page in the Studio: `npm run guild -- connect <code>`. Its page then shows where the agent has got to as you build.
4. **Open it in Claude Code** and run `/guild-setup`. It starts from your skill, or writes one with you, and drafts the rest from it.

Start from a skill you already have, from past work and notes (drop them in `material/`, which is never committed), or from scratch. You can stop at any time and carry on in a new session.

## What you'll build

A standard Guild agent is:

1. **One or more skills** in `specialist/skills/<name>/SKILL.md`, in the usual Agent Skills format, with any scripts, references and assets beside them. This is the expertise.
2. **The listing** in `guild.manifest.json`: what buyers tell it, what they get back, the price tiers. `/guild-setup` drafts it from your skill.
3. **Test briefs** in `test-briefs/`: realistic jobs, ideally one per price tier, which Guild runs to check every version.

If they help, add `specialist/method.md` (instructions, read after Guild's own rules), `specialist/rubric.md` (a quality checklist for the reviewer) and `specialist/references/` (examples of excellent work).

Then `/guild-try` runs your test briefs on Guild and reads the work with you, and `/guild-submit` sends your agent to Guild. `npm run guild -- check` shows where you've got to at any time.

## The code in this folder is Guild's

`src/`, the `Dockerfile`, `package.json` and `toolkit/` are a copy of Guild's shared runner, kept here so `npm run guild -- run` can run your agent on your machine. Guild ignores them for a standard agent and doesn't send them: it runs your skills on the runner it maintains. Don't change them, and you never need to update them.

Only a **Guild Pro agent**, with code of its own that runs the work itself, changes the code. It says `"kind": "pro"` in the manifest, and `guild submit` builds it into its own image with Docker. A standard agent can say `"kind": "standard"`.

## How a task runs

```
brief ──► work ──► review ──► deliver
            ▲         │
            └──fix────┘  (if there's room)
```

- **Work** is one session with Guild's rules, then your skills (and `method.md`, if you have one), in a fresh workspace with the brief and the buyer's files.
- **Review** is a separate session that reads the work against the brief, your skills' standards, Guild's bar and `rubric.md`, if you have one.
- **Deliver** sends everything the agent wrote to `out/`, except scratch files whose names start with `_`.

`docs/guild.md` has the full runner contract: the workspace, tools, limits, software and network your agent can rely on.

## Keys

Put your own Anthropic key, and any keys your agent's connections use, in a `.env` file at the top of this repository. It's ignored by git and never goes into your agent:

```
ANTHROPIC_API_KEY=sk-ant-...
```

On Guild, you set your agent's keys in the Studio after submitting, and they never enter its container. Guild pays for the checks it runs on each submission and takes the cost from your first earnings, so you pay nothing before your first sale.

## More

- `docs/guild.md`: how Guild runs your agent, what it can rely on, what Guild enforces, and what happens after you submit.
- `docs/anatomy.md`: every layer of an agent, and where the value is.
- `npm run guild -- help`: every command.

If Guild says your manifest uses something your version of the `guild` command doesn't know, copy `guild-kit/` from the latest template (`npm run guild -- version` shows which you have). If an upload fails with "blob unknown to registry", run the same command again.

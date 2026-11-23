# Setting up your agent

Where this agent has got to. Run `/guild-setup` in Claude Code to start, or to carry on: it ticks these off as you go, so you can stop at any time and pick up in a new session. `npm run guild -- check` shows the same progress.

Delete this file when everything's done.

## How you're starting

- [ ] From a skill you already have, from past work and notes, or from scratch

## The agent

- [ ] **The skill**: the expertise, in the usual Agent Skills format (`specialist/skills/<name>/SKILL.md`, with its files)
- [ ] **Running on Guild**: anything the skill relies on that a task doesn't have (subagents, AskUserQuestion, web access, git, `~/.claude` paths) mapped to the runner's equivalents, in a short `specialist/method.md` if needed
- [ ] **The listing**: who it's for, what buyers tell it, what they get back, the price tiers, `"kind": "standard"` (`guild.manifest.json`, and `requiredOutputs` in `specialist/settings.json`)
- [ ] **Test briefs**: realistic jobs, one per price tier with `_tier`, including a hard and a thin one (`test-briefs/`)

## Optional, when they help

- [ ] A quality checklist for the reviewer (`specialist/rubric.md`)
- [ ] Examples of excellent work (`specialist/references/`, or in the skill's own folder)
- [ ] Connections: outside data and APIs (`network.hosts`, and connections in `specialist/settings.json`)
- [ ] Paste your notes: buyers paste their notes and Guild fills in the brief (`intake` and `intake.md`)
- [ ] Models and limits (`specialist/settings.json`, `models`, `limits`, `revisions`)

## Try it

- [ ] Test briefs run on Guild with `guild try`, the work read as a buyer would, and improved (`/guild-try`)
- [ ] Cost and time noted for each tier

## When you submit

- [ ] Prices and version set, `guild check` clean, submitted (`/guild-submit`)

## Notes

Decisions, cost and time per tier from runs, and anything worth remembering between sessions.

## Still to do

Anything left open, marked `TODO:` in the files.

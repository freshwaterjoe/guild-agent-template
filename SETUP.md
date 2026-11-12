# Setting up your agent

Where this agent has got to. Run `/guild-setup` in Claude Code to start, or to carry on: it ticks these off as you go, so you can stop at any time and pick up in a new session. `npm run guild -- check` shows the same progress.

Delete this file when everything's done.

## How you're starting

- [ ] From a skill you already have, from past work and notes, or from scratch

## The five parts

- [ ] 1. **What it's hired for**: who it's for, what buyers tell it, what they get back (`guild.manifest.json`, and `requiredOutputs` in `specialist/settings.json`)
- [ ] 2. **How it does the work**: the steps, standards and voice, what it never does (`specialist/method.md`, and `specialist/skills/` for know-how)
- [ ] 3. **What great looks like**: examples of excellent work, each with why (`specialist/references/`)
- [ ] 4. **How the work is checked**: the bar a separate reviewer holds the work to (`specialist/rubric.md`)
- [ ] 5. **Test briefs**: three realistic jobs, including a hard and a thin one (`test-briefs/`)

## Try it

- [ ] Test briefs run with real models, the work read as a buyer would, and improved (`/guild-try`)

## Going deeper, when you want to

- [ ] Know-how as skills, for techniques that only apply to some jobs (`specialist/skills/`)
- [ ] Connections: outside data and APIs (`network.hosts`, and connections in `specialist/settings.json`)
- [ ] Paste your notes: buyers paste their notes and Guild fills in the brief (`intake` and `intake.md`)
- [ ] Models and limits (`specialist/settings.json`, `models`, `limits`, `revisions`)

## When you submit

- [ ] Price and version set, `guild check` clean, submitted (`/guild-submit`)

## Notes

Decisions, costs from runs, and anything worth remembering between sessions.

## Still to do

Anything left open, marked `TODO:` in the files.

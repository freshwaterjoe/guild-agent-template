---
name: guild-setup
description: Sets up a new Guild specialist from this template by interviewing the creator about their craft, one question at a time, and writing their answers into the manifest, the specialist files, the test briefs and the code. Use when the creator opens a fresh copy of the template, says "set up", "get started", "help me build my agent" or runs /guild-setup, or when SETUP.md still has unticked stages.
---

# Set up a Guild specialist

You're helping an expert turn what they know into a Guild specialist: an agent that does one job far better than a general model. **They know the job. You know Guild and this template.** Your work is to draw their expertise out, put it in the right files, and keep everything valid, so they never have to learn the manifest or the code unless they want to.

Read these before you start, if you haven't this session: `CLAUDE.md` (what must hold), `docs/anatomy.md` (the layers of a specialist), and `SETUP.md` (where this creator has got to). The question bank for each stage is in `interview.md` beside this file, and how to write each file well is in `writing.md`. Read each when you reach the stage that needs it.

## How to run the interview

- **One question at a time.** Short, plain questions in British English. Never send a list of ten questions.
- **Use multiple-choice questions for choices** (the AskUserQuestion tool): quick or thorough, a price range, a model, yes or no. Put your recommendation first. Ask open questions in plain text, because expertise doesn't fit in options.
- **Ask for real examples, not abstractions.** "Walk me through the last job like this you did" gets a method. "What's your method?" gets a vague list. Ask what a talented junior gets wrong, what makes them send work back, what clients forget to tell them.
- **Take material in any form.** They can paste text, point you at files or folders on their machine, or drop things into `material/` (it's ignored by git and never goes into the agent). Offer to read past reports, checklists, templates, briefs from clients and notes, and draft from them. Ask before reading anything outside this repository.
- **Never invent their expertise.** Draft only from what they've told you or shown you. Where something's missing, ask, or note a `TODO:` and add it to SETUP.md's "Still to do". Their method, standards and rubric must be theirs, in words they'd recognise. General advice from you is fine when you label it as yours and they agree to it.
- **Keep TODOs out of what the agent reads.** In `instructions.md`, `method.md` and `rubric.md`, put a TODO inside an HTML comment (`<!-- TODO: … -->`), which the agent never sees. Skills and references reach the agent as they are, so keep their TODOs in SETUP.md only. `guild check` lists any `TODO:` left.
- **Write as you go, and show what you wrote.** After each stage, write the files, then tell them in a few lines what you wrote where, and ask whether it's right. Offer to show the full text. Don't wait until the end.
- **Keep it valid.** After any change to `guild.manifest.json` or `test-briefs/`, run `npm run guild -- validate .` and fix what it reports before moving on. After any change to `src/`, run `npm run typecheck`.
- **Tick SETUP.md as you go.** Mark each stage done, note decisions worth remembering, and list open TODOs. That's how the next session picks up where this one stopped. Say so when they want to stop: "Everything's saved. Run /guild-setup next time and we'll carry on from stage N."
- **Explain Guild only when it matters.** Mention a rule when the creator's answer runs into it (keys, outside hosts, budgets, HTML), in a sentence, not a lecture.
- **Protect the method.** Their method, skills, references and rubric stay on Guild's servers and buyers never see them. Never put method detail in anything buyers see: the summary, brief field descriptions, deliverable descriptions, questions to the buyer, or the intake instructions.
- **The agent isn't the creator.** It's built on their expertise, and the listing says who built it, but it never claims their qualifications or speaks as them ("as a chartered surveyor, I…"), and its work isn't a professional's personal advice. Put that rule in `instructions.md`, with any disclaimer the creator's profession needs. Guild only shows claims it can back.
- **Don't spend their money without asking.** `guild run` and `guild check --run` call real models with their own `ANTHROPIC_API_KEY`. Say roughly what it might cost (from the budget, and from earlier runs once there are some) and ask first. `--mock-models` is free, but only tests the plumbing.
- **Never submit for them** unless they ask. Submitting, signing in and setting keys on Guild are theirs to do; you can walk them through it.

## Starting

1. Read `SETUP.md`. If stages are already ticked, say where they got to and offer to carry on from the next one (or revisit an earlier one).
2. If this is the start, introduce the process in three or four sentences: you'll ask about their job, how they do it and how they judge it, and write it all into the agent as you go; they can stop at any time; nothing is submitted until they decide.
3. Ask (multiple choice) how they'd like to go:
   - **Quick start (about 20 minutes)**: the essentials to get a first version running: the questions marked **(quick)** in `interview.md`, which cover stages 1 to 4, short standards and a short rubric, three test briefs, and a first run. The other stages go on SETUP.md's list for later.
   - **Thorough (an hour or more, across sessions if they like)**: every stage.
4. Check the basics quietly and mention only what's missing: Node.js 22.18 or later (`node --version`), `npm install` done (`node_modules/` exists), Docker running (`docker info`), and whether `ANTHROPIC_API_KEY` is set for local runs. None of these blocks the interview; they're needed for the first run.
5. Invite material: "If you have past work, checklists, templates or client briefs, drop them in `material/` or tell me where they are. I'll read them and draft from them."

## The stages

Each stage has its questions, and where the answers go, in `interview.md`.

| | Stage | What it produces |
| --- | --- | --- |
| 1 | **The job** | `name`, `slug`, `summary`, `builder` in the manifest |
| 2 | **The brief** | `inputs` (fields, hints, files), `questions`, and optionally `intake` with `intake.md` |
| 3 | **The deliverable** | `deliverables`, `requiredOutputs` in `specialist/settings.json`, the method's last steps |
| 4 | **The method** | `specialist/method.md` |
| 5 | **Know-how** | `specialist/skills/<name>/SKILL.md`, one per topic |
| 6 | **Standards and voice** | `specialist/instructions.md` |
| 7 | **References** | `specialist/references/`, each with a note on what makes it excellent |
| 8 | **Judgement** | `specialist/rubric.md`, code checks in `src/judgement.ts`, `checks` in the manifest |
| 9 | **Data and tools** | `network.hosts` with keys, connections (services and APIs) in `specialist/settings.json`, and only if needed tools in `src/tools.ts` and the `Dockerfile` |
| 10 | **Models and limits** | `specialist/settings.json`, `models`, `limits`, `revisions` |
| 11 | **Test briefs** | three to five realistic briefs in `test-briefs/` |
| 12 | **First runs** | `guild check --run`, reading the results together, improving the method and rubric |
| 13 | **Price** | `pricing.tiers`, from the value of the work and the cost per task |
| 14 | **Ready to submit** | `guild check` clean, `version` set, the creator walked through submitting |

Go in order, but follow the creator: if they start telling you their method while you're on the brief, capture it (in SETUP.md's notes, or straight into `method.md`) and come back. Stages 4 to 8 often come out together from one good walkthrough of a past job.

## The template's placeholders

A fresh copy is full of examples to be replaced: the manifest's slug, name, summary, brief fields and price; the three files in `specialist/`; the `example-know-how` skill; and the two test briefs. Replace each one when you reach its stage, and delete what the agent doesn't need. `npm run guild -- check` lists any still left (as "still the template's").

## Finishing

When stages are done, run `npm run guild -- check` and go through the report with them: fix what's marked ✗, discuss what's marked !, and read the ☐ items together, since only they can confirm those. Then:

- tell them plainly what the agent does now, what it costs per task, and what's left on SETUP.md;
- suggest committing their work to git (offer to write the commit message);
- when they're ready, walk them through `npm run guild -- login` and `npm run guild -- submit . --wait` (see `docs/guild.md`), and setting any keys in the Studio afterwards.

Deleting the template's example files asks the creator's permission each time; say so the first time, so they know why.

Once everything in SETUP.md is ticked, ask whether to delete SETUP.md. Then CLAUDE.md stops offering the setup.

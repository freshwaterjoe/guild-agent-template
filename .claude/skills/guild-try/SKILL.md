---
name: guild-try
description: Runs this Guild agent's test briefs with real models, on Guild with `guild try` (or on this machine with `guild run`), reads the work with the creator as a buyer would, notes what each price tier costs and how long it takes, and turns what they'd change into changes to the skill, its instructions or its checks. Use when the creator says "try it", "run it", "test it", "see what it does", or runs /guild-try, and after the setup is done.
---

# Try the agent, and make it better

The point of a try is to see the work as a buyer would, to see what each tier costs and how long it takes, and to improve the agent from what the creator thinks of it. Running is the easy part; reading the result together is the work.

## Two ways to run

- **On Guild, with `guild try` (the usual way, and the faithful test).** The agent's content goes to Guild and each brief runs on the runner Guild uses for hires, with the same safeguards, declared hosts and the keys set in the Studio. No Docker. It's for standard agents on Claude models. It needs the creator signed in (`npm run guild -- connect <code>` or `npm run guild -- login`) and their Anthropic key saved on Guild once. **An agent on OpenAI models can't be tried on Guild yet**: use `guild run`.
- **On this machine, with `guild run`.** For an agent on OpenAI models, to work offline, to test the plumbing for free with `--mock-models`, or for a Guild Pro agent. It needs Docker. It builds the runner code in this folder, which may be older than the runner Guild uses, so a standard agent can behave a little differently than on Guild. Declared outside hosts aren't reachable locally.

Prefer `guild try` where it's available. If a `guild run` result looks wrong, try the same brief on Guild before changing anything.

## Before running

1. **Check the basics**, and say only what's missing:
   - The key for the agent's provider is set, in the shell or in `.env` (ignored by git and never in the agent): `ANTHROPIC_API_KEY` for Claude models, `OPENAI_API_KEY` for OpenAI's. It's the creator's own key: they pay for these runs, on Guild or here.
   - For `guild try`: the creator is signed in (`npm run guild -- whoami`), and their key is saved on Guild. If `guild try` says Guild doesn't have it, ask before sending it: "Trying on Guild uses your own Anthropic key. Shall I send the one in your .env to Guild? It's sealed there, used only for your own trial runs, and never shown again." If they agree, run `npm run guild -- try --save-key`. Never send it without asking.
   - For `guild run`: Docker is running (`docker info`).
   - Any key the agent's connections need: on Guild, set in the Studio (**Versions and keys**), or for a sign-in (`oauth`) key, connected there with **Connect**; locally, in `.env` under the name its host declares (`network.hosts[].key.secret`). Never write a key into a file yourself: ask the creator to add it.
   - `npm run guild -- check` has nothing marked ✗. Fix those first. Go through any files it says won't be sent: the agent won't have them on Guild.
2. **One test brief per tier.** If the manifest has more than one tier and the test briefs don't each name one, suggest adding `"_tier": "<tier id>"` to each, so every tier is tried (`npm run guild -- validate .` after). Without it, a run doesn't show what a particular tier costs.
3. **Ask before spending.** Say which briefs you'll run and roughly what it costs: at most the manifest's `limits.budgetMicros` per brief, usually much less, and what earlier runs cost if there are any (`.guild/readiness.md`, "Runs and cost"). Offer one brief first if they'd rather. Ask (multiple choice): run one, run all, or check the plumbing for free (`guild run` with `--mock-models`, which tests that the agent starts and delivers, not the work, and needs Docker).

## Running

On Guild:

- One brief: `npm run guild -- try --brief test-briefs/<name>.json`. Add `--file <path>` to attach a sample buyer file, and `--answer "<text>"` to answer the agent's questions in order. Without `--answer`, a question gets the same reply as in Guild's checks: no buyer is there, so make a sensible assumption and carry on.
- Every brief, one after another: `npm run guild -- try --all`.
- Guild allows two tries at once and 20 a day per creator. Tries cost only what the models cost on the creator's key, and never reach buyers.

On this machine:

- One brief: `npm run guild -- run . --brief test-briefs/<name>.json`. If the agent asks a question, pass `--answer "<text>"`, or the run fails.
- Every brief, with the readiness report updated after: `npm run guild -- check --run`.

Runs take minutes, and how many depends on the job: the agent fixes what review finds, round after round, until the work passes, so a simple brief may take 8 minutes and a hard one 40. Run them in the background where you can, and tell the creator what's happening. The output shows each step and what it cost. Each run's files are in `.guild/runs/<run>/`, whichever way it ran: `task.json` (the brief), `result.json` (outcome, time, cost) and `deliverables/` (what the buyer would get). A run on Guild also has `events.jsonl` (each step), and `result.json` says where it ran (`onGuild`, with its page) and lists any calls Guild refused (`refused`).

## If a run was delivered with notes

The agent isn't told any limits. If one of Guild's safeguards stopped the work before review passed (the cost ceiling, the time ceiling, or rounds of fixes that stopped making progress), what was in `out/` is still delivered, with the reviewer's last notes. On a hire it goes to the creator's sign-off; in Guild's checks it still passes, with the notes beside it. The run report on its page on Guild (`onGuild` in `result.json`) shows the last review's notes.

Read the notes with the creator, against the work:

- **A real gap** (a step the skill doesn't cover, a standard it doesn't state, a check the agent should have run): fix the skill, or the rubric, and run the brief again.
- **The reviewer couldn't check it** (it only reads files): have the agent write the result of the check to `out/_checks.md`.
- **Notes the creator disagrees with**: say so, and tighten the skill's standards or the rubric so the reviewer judges as they would.

Never fix it by adding a timeline, a step count or "finish by" guidance to the skill or `method.md`, and never suggest it. The agent works the way it would in the creator's own Claude Code or Codex; Guild's safeguards step in only when needed. If a run reached the cost ceiling, the budget may be low for the job (`limits.budgetMicros`, set when submitting), or the skill may send the agent round in circles.

## If a run fails or falls short

Read why (the output, `result.json`, `events.jsonl`), explain it in a sentence, and fix the cause. Many come from the runner contract (`docs/guild.md`):

- **A file missing in `out/`**, or named differently from `requiredOutputs`: names are matched exactly. Say the exact names in the skill or `method.md`.
- **A refused call** (in `refused`): a host not declared, or a key not set.
- **A brief that doesn't match** the fields, or a `_tier` that isn't one of the manifest's tier ids.
- **Nothing in `out/`**: the agent broke, or a safeguard stopped it before it wrote anything. Read `events.jsonl` for where it got to.
- **Declined**: read `out/_decline.md`'s reason. If the agent should have done the job, make the skill clearer about when to decline; if it was right, and the brief tests that judgement, add `"_expect": "decline"` to it.
- **Waited on a question**: the task's time keeps running while a question waits, and in checks no one answers. Prefer stated assumptions.
- **Failed review on something the reviewer couldn't check**: it can only read files. Have the agent run the check and write the result to `out/_checks.md`.
- **A tool or program that isn't there**: no AskUserQuestion, no WebFetch (use `read_page`), no ImageMagick, LaTeX, wkhtmltopdf or Puppeteer, and nothing can be installed. A script that calls a host directly needs the host declared. Map it in `specialist/method.md` (`/guild-setup`, "Starting from a skill").

Never fix a standard agent by changing `src/`, the `Dockerfile` or the dependencies: they're Guild's runner, ignored on Guild. Then offer to run it again.

## Reading the work together

This is the part that matters.

1. **Show them the deliverable**, or where to open it. Don't summarise it for them first: let them read it as a buyer would.
2. **Ask**: "Would you be happy to be paid for this, at this tier's price? What would you change?" Then: "What would a demanding client push back on?"
3. **Read it against the skill's standards and the rubric, if there is one, yourself**, and say plainly where it falls short, and anything the reviewer let through that it shouldn't have.
4. **Turn each piece of feedback into a specific change**, in the right place:
   - wrong order, missed step, bad judgement call, not the standard they'd expect: **the skill** (or a better example in it);
   - something from their own Claude Code or Codex that doesn't work on Guild, or a tier doing too much or too little: **`method.md`**;
   - something bad got through: a must-have in **`rubric.md`**, or a check the agent runs and writes to `out/_checks.md`;
   - the brief didn't ask for something it needed: **the listing** (a field).
   Propose each change in a line, let them agree or reword it, then make it. Never make the agent generic to make it pass: the fix should sound like the creator.
5. **Run again** when they're ready, ideally the brief that went wrong, and compare.

## Afterwards

- **Cost and time per tier.** Note in SETUP.md's notes, for each tier, what its test brief cost and how long it took, from `result.json` or `guild check`. Note too if a run came close to the budget: every tier shares it, so the largest sets it. This is for the creator and the price, never for the skill: don't turn it into a timeline.
- Tick "Try it" once they've read the work and are happy with it.
- Mention each tier's cost against the price they have in mind: `npm run guild -- check` shows each tier's share after Guild's 25% and the costliest run. That's what `/guild-submit` prices from.
- When it's good across the test briefs, offer `/guild-submit`.

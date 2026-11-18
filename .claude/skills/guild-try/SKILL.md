---
name: guild-try
description: Runs this Guild agent's test briefs with real models, on Guild with `guild try` (or on this machine with `guild run`), reads the work with the creator as a buyer would, against the rubric, and turns what they'd change into changes to the method, rubric, references or skills. Use when the creator says "try it", "run it", "test it", "see what it does", or runs /guild-try, and after the setup's five parts are done.
---

# Try the agent, and make it better

The point of a try is to see the work as a buyer would, and to improve the agent from what the creator thinks of it. Running is the easy part; reading the result together is the work.

## Two ways to run

- **On Guild, with `guild try` (the usual way).** While the agent's code is the template's, unchanged (nothing in `src/`, the `Dockerfile` or the dependencies changed), the agent's own files go to Guild and each brief runs there, on Guild's real runtime, the way a hire runs. No Docker. Declared outside hosts are reachable, and keys set in the Studio are added. It needs the creator signed in (`npm run guild -- connect <code>` or `npm run guild -- login`) and their Anthropic key saved on Guild once.
- **On this machine, with `guild run`.** For an agent with code of its own, or to test the plumbing for free with `--mock-models`. It needs Docker, and declared outside hosts aren't reachable locally.

`guild try` says so if the agent has code of its own; then use `guild run`.

## Before running

1. **Check the basics**, and say only what's missing:
   - `ANTHROPIC_API_KEY` is set, in the shell or in `.env` (ignored by git and never in the agent). It's the creator's own key: they pay for these runs, on Guild or here.
   - For `guild try`: the creator is signed in (`npm run guild -- whoami`), and their key is saved on Guild. If `guild try` says Guild doesn't have it, ask before sending it: "Trying on Guild uses your own Anthropic key. Shall I send the one in your .env to Guild? It's sealed there, used only for your own trial runs, and never shown again." If they agree, run `npm run guild -- try --save-key`. Never send it without asking.
   - For `guild run`: Docker is running (`docker info`).
   - Any key the agent's connections need: on Guild, set in the Studio (**Versions and keys**); locally, in `.env` under the name its host declares (`network.hosts[].key.secret`). Never write a key into a file yourself: ask the creator to add it.
   - `npm run guild -- check` has nothing marked ✗ in the five parts or Guild's rules. Fix those first.
2. **Ask before spending.** Say which briefs you'll run and roughly what it costs: at most the manifest's `limits.budgetMicros` per brief (the template's is $3), usually much less, and what earlier runs cost if there are any (`.guild/readiness.md`, "Runs and cost"). Offer one brief first if they'd rather. Use AskUserQuestion: run one, run all, or check the plumbing for free (`guild run` with `--mock-models`, which tests that the agent starts and delivers, not the work, and needs Docker).

## Running

On Guild:

- One brief: `npm run guild -- try --brief test-briefs/<name>.json`. Add `--file <path>` to attach a sample buyer file, and `--answer "<text>"` to answer the agent's questions in order.
- Every brief, one after another: `npm run guild -- try --all`.
- Guild allows two tries at once and 20 a day per creator. Tries cost only what the models cost on the creator's key, and never reach buyers.

On this machine:

- One brief: `npm run guild -- run . --brief test-briefs/<name>.json`.
- Every brief, with the readiness report updated after: `npm run guild -- check --run`.

Runs take minutes. Run them in the background where you can, and tell the creator what's happening. The output shows each step and what it cost. Each run's files are in `.guild/runs/<run>/`, whichever way it ran: `task.json` (the brief), `result.json` (outcome, time, cost) and `deliverables/` (what the buyer would get). A run on Guild also has `events.jsonl` (each step), and `result.json` says where it ran (`onGuild`, with its page) and lists any calls Guild refused (`refused`).

If a run fails, read why (the output and `result.json`), explain it in a sentence, and fix the cause: a missing file in `out/`, a key not set, a host not declared (a refused call shows in `refused`), a brief that doesn't match the fields. Then offer to run it again.

## Reading the work together

This is the part that matters.

1. **Show them the deliverable**, or where to open it. Don't summarise it for them first: let them read it as a buyer would.
2. **Ask**: "Would you be happy to be paid for this? What would you change?" Then: "What would a demanding client push back on?"
3. **Read it against the rubric yourself**, and say plainly where it falls short of a must-have, and anything the reviewer let through that it shouldn't have.
4. **Turn each piece of feedback into a specific change**, in the right part:
   - wrong order, missed step, bad judgement call: **how it does the work** (`method.md`, or a skill);
   - not the standard they'd expect: **what great looks like** (a better example, with a note on why) or the standards in `method.md`;
   - something bad got through: **how the work is checked** (a new must-have in `rubric.md`);
   - the brief didn't ask for something it needed: **what it's hired for** (a field).
   Propose each change in a line, let them agree or reword it, then make it. Never make the agent generic to make it pass: the fix should sound like the creator.
5. **Run again** when they're ready, ideally the brief that went wrong, and compare.

## Afterwards

- Note in SETUP.md's notes what each run cost and took, and what changed. Tick "Try it" once they've read the work and are happy with it.
- Mention the cost per task against the price they have in mind: `npm run guild -- check` shows each price tier's share after Guild's 25% and the costliest run.
- When it's good across the test briefs, offer `/guild-submit`.

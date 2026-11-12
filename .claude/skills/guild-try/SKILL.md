---
name: guild-try
description: Runs this Guild agent's test briefs with real models, reads the work with the creator as a buyer would, against the rubric, and turns what they'd change into changes to the method, rubric, references or skills. Use when the creator says "try it", "run it", "test it", "see what it does", or runs /guild-try, and after the setup's five parts are done.
---

# Try the agent, and make it better

The point of a try is to see the work as a buyer would, and to improve the agent from what the creator thinks of it. Running is the easy part; reading the result together is the work.

## Before running

1. **Check the basics**, and say only what's missing:
   - Docker is running (`docker info`). Runs happen in a sealed container on this machine, the way Guild runs them.
   - `ANTHROPIC_API_KEY` is set, in the shell or in `.env` (ignored by git and never in the agent). It's the creator's own key: they pay for these runs.
   - Any key the agent's connections need is in `.env` too, under the name its host declares (`network.hosts[].key.secret`). Never write a key into a file yourself: ask the creator to add it.
   - `npm run guild -- check` has nothing marked ✗ in the five parts or Guild's rules. Fix those first.
2. **Ask before spending.** Say which briefs you'll run and roughly what it costs: at most the manifest's `limits.budgetMicros` per brief (the template's is $3), usually much less, and what earlier runs cost if there are any (`.guild/readiness.md`, "Runs and cost"). Offer one brief first if they'd rather. Use AskUserQuestion: run one, run all, or check the plumbing for free (`--mock-models`, which tests that the agent starts and delivers, not the work).

## Running

- One brief: `npm run guild -- run . --brief test-briefs/<name>.json`. Add `--file <path>` to attach a sample buyer file.
- Every brief, with the readiness report updated after: `npm run guild -- check --run`.

Runs take minutes. Run them in the background where you can, and tell the creator what's happening. The output shows each step, every model call's cost, and the reviewer's verdicts. Each run's files are in `.guild/runs/<run>/`: `task.json` (the brief), `result.json` (outcome, time, cost) and `deliverables/` (what the buyer would get).

If a run fails, read why (the output and `result.json`), explain it in a sentence, and fix the cause: a missing file in `out/`, a key not passed, a host not declared, a brief that doesn't match the fields. Then offer to run it again.

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

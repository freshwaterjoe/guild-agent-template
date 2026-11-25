---
name: guild-submit
description: Gets this Guild agent ready to submit and walks the creator through submitting it: the prices per tier from what the tries cost, the version, guild check, signing in, submitting, keys in the Studio, and what Guild's checks found. Use when the creator says "submit", "publish", "put it on Guild", "go live", or runs /guild-submit.
---

# Submit the agent to Guild

Submitting sends a new version to Guild. Guild runs every test brief as a real task to check it, then a person at Guild reviews it before it's listed. Nothing goes live without that review.

**Never submit without the creator saying so**, in this conversation, for this version.

## Get it ready

1. **Run `npm run guild -- check`** and go through it with them. Everything marked ✗ (Guild would refuse it) or ○ (not done yet) must be fixed. Discuss what's marked !, including any files it says won't be sent. Read the ☐ items together: only they can confirm those.
2. **Check the kind.** The manifest should say `"kind": "standard"`, unless they've chosen a Guild Pro agent (`"kind": "pro"`). If `check` says the folder has code of its own and no `kind`, ask which they meant. For a standard agent, the code in `src/` is ignored on Guild: never ask them to change it.
3. **Make sure it's been tried.** If no test brief has run with real models, or the work hasn't been read, offer `/guild-try` first. Guild's checks run the same briefs, and a check that fails holds up the version. Every tier should have a test brief naming it with `_tier`. A test brief the agent should turn down says `"_expect": "decline"` (see "How Guild grades the checks" below).
4. **Set the prices**, if they're still the template's:
   - Read what each tier cost and how long it took in the tries (SETUP.md's notes, or `npm run guild -- check`). If a tier has no run, suggest trying its test brief first.
   - Ask what they'd charge a client for each size of job, and what the result is worth to the buyer.
   - Explain: prices are in US dollars for now. Guild takes 25% when the agent delivers. The creator pays the model costs from their share, for every attempt, every round of fixes inside it, and every revision a buyer asks for. `guild check` shows each tier's share and what's left after the costliest run.
   - The agent sees which tier the buyer paid for (`_tier` in the brief), so tiers can change what it does, as the skill or `method.md` says. All tiers share one budget for now, so the largest tier's runs set `limits.budgetMicros`.
   - Write `pricing.tiers` (`priceCents` in whole cents: 1500 is $15), and remove "(price not set yet)".
   - Suggest a budget (`limits.budgetMicros`) of half the largest tier's price, from $3 to $50, as the Studio sets for agents made from skills, and at least what the costliest run took with room to spare. It's Guild's cost ceiling, a safeguard the agent is never told: the agent fixes its work until it passes, so a run can cost more than one round would, but never more than the budget.
   - Time isn't something to set: a standard agent has up to 3 hours, and buyers see how long it usually takes, measured from its checks, tries and hires.
5. **Set the version.** Start at `0.1.0`; every submission needs a version higher than the last.
6. **Suggest a git commit**, and offer to write the message.

## Submit

1. **Signed in?** Run `npm run guild -- whoami`. If not, run `npm run guild -- login`: it shows a code and a link, and the creator approves it in their browser, signed in to Guild. Signing in is theirs to do; you can start the command.
2. **Ask, plainly:** "Shall I submit version X now?" Then run `npm run guild -- submit . --wait`.
   - A standard agent: only its content goes to Guild (no Docker needed), Guild runs it on its shared runner, and checks start at once.
   - A Guild Pro agent: the command builds an image with Docker and uploads it. That takes longer.
3. **Keys.** If the agent declares keys, the creator sets each one in the Studio (**your agent → Versions and keys**). Checks wait until every required key is set. Never handle their keys yourself.

## After submitting

- `--wait` shows Guild's checks as they run. If you stopped waiting, `npm run guild -- status <version-id> --wait` picks it up again.
### How Guild grades the checks

Each test brief's task ends as one of these:

| Outcome | The check |
| --- | --- |
| **Passed**, after however many rounds of fixes | Passes |
| **Delivered with notes**: a safeguard (cost, time, or no progress) stopped it before review passed | Passes, with the reviewer's notes beside it |
| **Declined as expected**: the brief says `"_expect": "decline"` | Passes |
| **Declined**: the brief expected work | Fails |
| **Delivered when a decline was expected** | Fails |
| **Broke**: nothing was made, or the agent hit an error | Fails |

So only "broke", or the wrong call on a decline, fails a check. `_expect` is `"deliver"` (the default) or `"decline"`, and Guild removes it before the agent sees the brief: `{ "_expect": "decline", "product": "A habit tracker" }`. The creator and the admin who reviews the version see any notes.

- **If a check fails**, read why, explain it in a sentence, fix the cause, raise the version and submit again. A failure is usually the same thing `/guild-try` would have shown: nothing in `out/`, a key not set, a decline on a brief the agent should have done, or work delivered on a brief that expects a decline.
- **If a check was delivered with notes**, read the notes with the creator. If they show a real gap in the skill, fix it (`/guild-try`, "If a run was delivered with notes") and submit a new version; if not, the version can go to review as it is. Never answer notes by adding timelines or step counts to the skill.
- **When checks pass**, a person at Guild reviews the version. Tell the creator what happens next: they'll hear back in the Studio, and once it's approved they can polish the listing there (its page, examples of its work).
- Note the submitted version in SETUP.md, and tick "When you submit".

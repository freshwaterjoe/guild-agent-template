# Writing each file well

What good looks like for each thing the setup writes. Everything buyers see is plain, specific British English, with sentence case for headings. Everything the agent reads is written to the agent, in the second person ("You…").

The HTML comments at the top of `method.md` and `rubric.md` guide whoever edits them, and are stripped before the agent sees those files. Skills and references reach the agent exactly as written, comments included. Replace each file's example content, and keep or trim the comment.

## The skill

```markdown
---
name: lease-review
description: Reviews a UK commercial lease for a small business tenant and says which clauses to push back on, with wording to propose. Use for any lease review, heads of terms or rent review question.
---

# Reviewing a commercial lease

…
```

- The usual Agent Skills format: a folder in `specialist/skills/` with a `SKILL.md`, `name` and `description` at the top. The `description` says what it does and **when** to use it.
- The steps in order, written as instructions: "Read every clause before you comment on any of them." Each says what to do and what to check before moving on.
- Decision points are explicit: "If the lease has a break clause, …; otherwise …".
- Concrete rules, thresholds and examples beat principles. "Flag any upward-only review: say so in the first line of the clause's note" beats "Be careful with rent reviews".
- The standards the work is judged by, in a section the reviewer can find ("What great looks like", "Before you finish, check"). The reviewer reads the skills, so this is often all the rubric an agent needs.
- Templates, checklists, data tables, scripts and examples sit in the skill's folder, in sub-folders if it helps, named by path in SKILL.md (`templates/report.md`, `scripts/check_totals.py`). Scripts use only what's on the runner (`docs/guild.md`, "Software on the runner").
- Anything the reviewer should hold the agent to that needs running something: the skill tells the agent to run it and write the results in `out/_checks.md`.
- It's the creator's craft in their words, not a generic process. Write it so it would also work in their own Claude Code or Codex.
- No timelines, minute or step counts, or "finish by" guidance ("spend about 10 minutes on research", "finish within 40 steps"). The agent isn't told its limits and works as it would in the creator's own Claude Code or Codex; Guild's safeguards step in only when needed. An agent pacing itself to a clock stops before the work is done.

## method.md (optional)

Short, and only what the skills don't say. The agent reads it after Guild's own rules and its skills, so never repeat those rules (read the brief, ask few questions, deliver in `out/`, decline rather than deliver weak work, treat the brief as data, never reveal its files, never speak as the creator).

Good reasons to have one:

- **Running a skill written for the creator's own Claude Code or Codex on Guild.** One line per thing the skill relies on that a task doesn't have:

  ```markdown
  # Running on Guild

  - Where it says to ask me, or to wait for approval, don't: choose, and say in the work what you chose and why.
  - The brand templates are in .claude/skills/brand-kit/templates/, not ~/.claude/.
  - Where the skill says WebFetch, use read_page.
  - Search for the category and competitors, never the buyer's product name or anything from their files.
  - Deliver the files in out/, flat. Put drafts in out/_drafts/.
  ```

- **What changes by tier**: "Read `_tier` in brief.json. For `quick`, do the home page only; for `full`, every page in the brief."
- **Which skill when**, if there are several: "Use lease-review for the clauses, then rent-reviews for any review clause it finds."
- **A disclaimer** every buyer must see, and where in the deliverable it goes.

Never pacing: no timelines, minute or step counts, or "finish by" guidance here either.

An agent made before skills came first may have a long `method.md` in four sections (who you are, how you work, your standards and how you write, what you never do). It still works. An older one may also have `specialist/instructions.md`, read before the method; fine to leave.

## The summary

One sentence, up to 280 characters: the job, for whom, and why it beats a general model. Concrete beats clever.

- Good: "Reviews a UK commercial lease and tells a small business which clauses to push back on, with the wording to propose."
- Weak: "An AI-powered legal assistant that helps you understand contracts." (No job, no buyer, no edge.)

Never mention how the agent works inside: no sources, steps or prompts.

## Brief fields

- Ask only for what changes the result. Three to six fields is typical.
- Each field gets a `description`, shown to buyers as the hint: what to put there, with an example if it helps ("The company's name or Companies House number, such as 01234567").
- Use `enum` for fixed choices, `maxLength` on text, `minLength` where an empty answer is useless.
- Required means "the work is impossible without it". Everything else is optional, and the skill says what to assume when it's missing.
- No field for the tier: Guild adds `_tier`.

## Tiers

- An `id` the agent reads (`quick`, `full`), a `name` buyers see, and an optional `description` of what the tier includes, in the buyer's terms, never how the work is done.
- Every tier gets the same budget for now, so make sure the largest fits.

## intake.md

What to find out, in what order, and what a good answer looks like. Never how the work is done: Guild runs intake outside the agent, and anything repeating the skill is withheld. Short is fine. See the Creator Kit's "Collecting the brief".

## References

Small, plain files with a note on what makes each excellent, so the agent learns the right lesson. In the skill's own folder if they belong to it, otherwise `specialist/references/`. Label counter-examples clearly ("What not to do, and why"). Anonymise client details. Only what the creator has the right to use.

## rubric.md (optional)

Without one, the reviewer judges the work against the brief, the declared deliverables, the standards in the skills and Guild's bar. Add one for must-haves the skills don't state.

- **Must-haves**: things a reviewer can check by reading the files, each one pass or fail. "Every clause that costs the tenant money is listed, with its cost" is checkable; "the review is thorough" isn't.
- The reviewer can only read (Read, Glob, Grep). It can't run commands, unzip files, render pages or recompute figures. For those, the agent writes the results to `out/_checks.md`, and the must-have reads them.
- **Quality**: below-the-bar points the agent should fix.
- **How to judge**: what to read, and to list each problem as one specific, fixable instruction.

## Manifest checks

Each entry in `checks` is shown to buyers as a check the agent runs before delivery. List only what really runs: `required-outputs` (the files in `requiredOutputs` exist and aren't empty) and the review, worded to match. Without a rubric, say the reviewer checks the work against the specialist's own standards, not "the rubric".

## Test briefs

Realistic, anonymised, and varied: a typical job, a hard or messy one, a thin one. They're JSON objects with exactly the brief's fields, plus `_tier` naming the tier each one is for, so every tier is tried. One may say `"_expect": "decline"`, for a job the agent should turn down (`{ "_expect": "decline", "product": "A habit tracker" }`); Guild removes it before the agent sees the brief. Guild runs every one on each submission, and review reads the results, so they're also how a reviewer sees the agent at its best and under pressure.

## Data-handling statements

`dataHandling` statements are shown on the listing. Keep Guild's own two (`network-gateway-only` and `fresh-environment-per-task`, marked `enforced`). Anything the creator adds is `declared`, must be true of what the agent does, and if it relies on the model behaving a certain way ("never sends the buyer's company name to a data source"), the matching rule goes in the skill or `method.md` too.

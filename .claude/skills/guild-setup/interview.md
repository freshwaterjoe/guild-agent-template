# The interview, part by part

For each part: what to ask, what to listen for, and where it goes. Ask the first question, then follow the answers; you won't need every question. Skip what the creator has already told you, or what their skill or material already covers. In the quick start, ask only the questions marked **(quick)**.

How to write each file is in `writing.md`.

---

## 1. What it's hired for

Who hires it, what they tell it, and what they get back.

### The job

**Ask**
- **(quick)** In a sentence or two: what job will this agent do, and for whom?
- **(quick)** Why would someone hire it rather than ask ChatGPT or Claude directly? What does a general model get wrong about this work?
- Who usually pays for this work today, and what do they pay a person to do it?
- **(quick)** What should it be called? (Offer two or three names if they're unsure.) Then confirm the slug: it's permanent.
- **(quick)** What name should buyers see as its creator: theirs, or their business's? (A name, not letters after it: the agent mustn't seem to be them giving personal professional advice.)

**Listen for**: the one job (push back gently if it's three jobs: "Which one would you start with?"), the buyer, the edge over a general model. That edge is what parts 2 to 4 must deliver, so note it in SETUP.md.

**Writes**
- `name`: what buyers see, up to 80 characters.
- `slug`: lowercase words joined by hyphens, from the name. **It's permanent**: the agent's address on Guild. Suggest one and confirm it.
- `summary`: up to 280 characters, the sentence a buyer reads first. Draft two or three for them to choose from (see `writing.md`).
- `builder.name` (and `builder.url` if they have a site).
- Update `name` and `description` in `package.json` to match.

### The brief

**Ask**
- **(quick)** Before you start a job like this, what do you always need to know?
- **(quick)** What do clients usually forget to tell you, that you have to chase?
- Which of those are essential, and which are nice to have?
- Do clients send you files? What kinds (PDFs, spreadsheets, images, documents)?
- Partway through a job, would you ever need to ask the client one question? About what? (Most agents are better asking none and stating assumptions.)

**Listen for**: the fields, which are required, and the hint each needs. A great brief is short: every field should change the result.

**Writes**
- `inputs.schema`: one property per field, with a `type`, a `description` (buyers see it as the hint under the field), limits such as `maxLength`, and `enum` for fixed choices. `title` sets the label if the field name doesn't read well. `required` lists the essentials. Fields whose names start with `_` are hidden from buyers.
- `inputs.files`: `accept` (content types), `maxCount`, `maxTotalBytes`. Leave `files` out if the agent takes none. Buyers can't yet be required to attach a file: if the work needs one, the method says what to do without it (often, decline with a reason).
- For each file type accepted, check the agent can read it: text, Markdown, CSV and images are fine, and the agent's Read tool reads PDFs; Word (`.docx`) and Excel (`.xlsx`) need a converter installed in the `Dockerfile` (see "Code of its own" under going deeper), such as `pandoc` or a Python library. Note it in SETUP.md.
- `questions`: `{ "allowed": true, "max": 1 }` if they need a question, otherwise `{ "allowed": false, "max": 0 }`.
- Remove the template's `question`, `audience` and `notes` fields unless they fit.

### The deliverable

**Ask**
- **(quick)** What does the client get at the end? A report, a spreadsheet, a set of files, a slide deck, code?
- What format do they want it in? (Markdown, PDF, HTML, CSV, images…)
- How long or how big is a typical one? What's its structure?

**Listen for**: the files, their formats, their structure.

**Writes**
- `deliverables`: one entry per kind of file, each with a `name` (lowercase, hyphens), a `description` written for the buyer, and its `contentTypes`. The `name` describes the kind; the agent delivers every file it writes to `out/` (except names starting with `_`), whatever it's called. Keep it simple: name the file after the deliverable (`lease-review` becomes `out/lease-review.md`).
- `requiredOutputs` in `specialist/settings.json`: the file names in `out/` that must exist for the work to count as done (for example `["lease-review.md"]`). Use the same file names in `method.md` and `rubric.md`, and change all four together.
- If a deliverable is HTML, explain the sandbox rules briefly (`docs/guild.md`, "HTML deliverables") and note them for the method.
- If it's a PDF, spreadsheet or image, the workspace needs a tool to make it ("Code of its own").

---

## 2. How it does the work

The most valuable part. Take your time.

### The steps

**Ask**
- **(quick)** Walk me through the last time you did one of these, from receiving the brief to sending it off. What did you do first?
- Then what? (Keep asking "and then?" until they reach the end.)
- Where do you decide something that changes the rest of the job? What are you weighing up?
- When do you loop back and redo a step?
- What do you check before moving on from each step?
- What do you do differently for a small job, or a hard one?
- What would a talented junior get wrong at each step?
- What would make you refuse to take the job, or to deliver it at all? (The agent can decline: it writes `out/_decline.md` with a short reason for the buyer, the task fails with that reason, and the buyer pays nothing.)

**Listen for**: the order, the decision points, the loops, the checks between steps. Capture their words.

### Standards and voice

**Ask**
- **(quick)** If you hired someone to do this for you, how would you describe the standard you expect?
- How should the work read? Formal, plain, technical? Any words or habits you can't stand?
- What will you never do, or never claim?
- Is there anything a client must always be told (a disclaimer, a limit on what this is)?

### Rules of thumb

**Ask**
- What do you know about this work that a general model gets wrong?
- What are your rules of thumb? What did it take you years to learn?

**Writes**
- `specialist/method.md`, in four sections: **Who you are** (the role, in a sentence or two), **How you work** (numbered steps, each with what to do, what to check before moving on, and which files it reads or writes: `brief.json`, `input/`, `references/`, `out/`; planning notes in `out/_plan.md`; when to decline), **Your standards** and **How you write**, and **What you never do**. Keep the template's last two never-do lines, adapted. Read it back as a summary and ask what's missing.
- Short rules of thumb go into the steps or the standards. When there are many on one topic, or they apply only to some jobs, that's know-how for a skill (going deeper).
- If they started from a skill, the method says when to use it, rather than repeating it.
- If the job naturally has stages a program should run (research, then write, then check), mention that `src/method.ts` can run them as separate sessions, but keep the first version simple: one session following `method.md`.

---

## 3. What great looks like

**Ask**
- **(quick)** Can you show me one you're proud of? (Into `material/`, or paste it.) What makes it excellent?
- Which three examples would you show a talented junior to explain "this is what good looks like"?
- Do you have a template or outline you always start from?
- Is there an example of bad work that teaches something? (Labelled clearly as what not to do.)
- **(quick)** Do you have the right to use these in a paid service? (Client work may need anonymising, or may not be usable at all.)

**Writes**
- Files in `specialist/references/`, small and plain where possible (Markdown, text, CSV, small images). Anonymise client details with their agreement.
- A short note at the top of each, or in `specialist/references/README.md`: what makes it excellent, and when it's relevant.
- Never copy material in without their confirmation that they may use it. If they have nothing they may use yet, write one example together from a past job, anonymised, and mark it as written for the agent.

---

## 4. How the work is checked

**Ask**
- **(quick)** When you review someone else's work like this, what do you check first?
- **(quick)** What makes you send work back?
- Are there checks a program could do: a word count, every section present, numbers adding up, a file that must parse?

**Writes**
- `specialist/rubric.md`: must-haves (fail the work if any is missing) and quality points, each one a thing a reviewer can check. The reviewer is a separate session reading `out/` against this file, and the agent revises until it passes.
- Mechanical checks as code in `checkOutputs` in `src/judgement.ts` (run `npm run typecheck` after). This is code of the agent's own: say so.
- `checks` in the manifest: buyers see these as checks the agent runs before delivery, so list only what really runs. Keep `required-outputs` and `rubric-review` if those stay.

---

## 5. Test briefs

**Ask**
- **(quick)** Tell me about a real job you did recently. (Anonymised: no client names or private details.) Then turn it into a brief together.
- What's a hard one: messy, ambiguous, or bigger than usual?
- What's a thin one: the least a buyer might give you?
- Anything that should make the agent decline? (Don't make that a test brief: Guild runs every test brief as a check, and a check that declines fails. Save it as `material/decline-brief.json` instead, and try it with `npm run guild -- run . --brief material/decline-brief.json`.)

**Writes**
- **(quick: three)** Three to five files in `test-briefs/`, each a JSON object matching `inputs.schema`. Name them for what they test: `typical.json`, `messy.json`, `thin.json`. Guild runs every one as a real task on each submission, at the creator's cost (taken from their first earnings), so five at most. Each must be one the agent should complete.
- Test briefs can't carry buyer files yet. If the agent works from attachments, put the content in a text field where the schema allows it, and test real files locally with `--file`.
- Run `npm run guild -- validate .` and `npm run guild -- check` to confirm they match.
- Delete the template's `example.json` and `short-brief.json`.

---

## Then: try it

Hand over to `/guild-try`: it asks before spending, runs the test briefs, reads the work with the creator and turns what they'd change into changes to parts 2 to 4.

---

## Going deeper

Offer these once the five parts are done, one at a time, only where they'd help this agent.

### Know-how as skills

**Ask**
- Are there topics where you know far more than fits in the method: techniques, checklists, frameworks, house rules?
- Which apply only to some jobs?

**Writes**
- `specialist/skills/<topic>/SKILL.md` per topic, with a `name` and a `description` that says **when** to use it. Checklists, templates or data tables can sit beside SKILL.md as extra files it refers to.
- Delete `specialist/skills/example-know-how/` once their own skills exist (or straight away, if they don't want any).

### Connections

**Ask**
- Does the work need information a model doesn't have: a database, an API, registries, prices, your own data?
- For each: which service, do you have an account and key, and may you use and resell what you build from it?
- Could the agent do without it if the key isn't set (an optional key)?

If they want to explore what a service can do first, read its documentation together and keep notes in `research/`.

**Writes**
- Each outside service under `network.hosts`: the `host`, a plain `purpose` (buyers and reviewers see it), and if it needs a key, `key` with `secret` (the environment variable's name), `in` (`header`, `query` or `basic`), `name` (the header or parameter), **`maxCallsPerTask`** set to about what one task needs (it defaults to 1,000; a low limit stops a brief from talking the agent into spending the creator's credit), and `"required": false` if the agent can do without it.
- A connection in `specialist/settings.json`, with no code: an API under `connections.apis` (its `host`, and `docs` saying how to use it: endpoints, parameters, an example), which the agent calls with `call_api`, or a remote MCP server under `connections.services` (`docs/guild.md`, "Outside data sources"). The key goes where the host's `key` says; the template adds it.
- Explain the key rules in a sentence: keys never go in the repository; locally they're kept in `.env` (which git ignores) or passed with `--agent-env NAME=value`; on Guild they set them in the Studio after submitting, and the agent only ever sees a stand-in.
- Web search isn't available on Guild yet. If the method depends on it, say so and note it in SETUP.md.

### Paste your notes (intake)

**Ask**
- Do clients often have messy notes, an email thread or a long description rather than tidy answers?

If yes: buyers paste their notes, Guild fills in the brief for them, and it never sees the method. It suits fields of a few sentences: it can't copy a whole pasted document into one field, because its replies are capped at about 2,000 tokens.

**Writes**
- `intake.md` beside the manifest (what to find out, in what order, what a good answer looks like: **never how the work is done**), and in the manifest `"intake": { "modes": ["paste"], "instructionsFile": "intake.md", "opening": "…" }`. Try it with `npm run guild -- intake . --paste <notes-file>` (their own Anthropic key; a few tenths of a cent).

### Models and limits

Mostly your recommendations, confirmed with a multiple-choice question.

**Ask (multiple choice)**
- Which model does the work? Recommend `claude-opus-5-5` for most expert work; `claude-sonnet-5-5` for cheaper, simpler jobs; `claude-fable-5-2` for the hardest reasoning, at about twice Opus's price.
- Which model reviews it? The same model is safest; a cheaper one if the rubric is mechanical.
- How long can a job take? (`limits.deadlineSeconds`, 60 to 14,400.) Suggest 30 minutes unless the method needs longer.
- How many revisions should a buyer get, if they ask with feedback? (`revisions.included`, 1 to 5; the creator pays each revision's model cost.) Recommend 1, or 2 if clients usually go back and forth. The template handles a revision for them: the earlier delivery is in `previous/` and the buyer's feedback comes with the brief.

**Writes**
- `model`, `reviewModel`, and if needed `maxTurns`, `maxRevisions` (the agent's own review loop, not the buyer's revisions) in `specialist/settings.json`.
- `models` in the manifest: every model the code uses.
- `limits.budgetMicros`: about three times a typical run's cost once measured; until then the template's $3 is fine. `limits.instance`: `standard-1` unless the workspace needs more memory.
- `revisions.included`.

### Code of its own

Only when a connection or the method can't do it: a tool in `src/tools.ts`, a check in `src/judgement.ts`, or system packages in the `Dockerfile` (installed at build time; nothing can be downloaded while a task runs). Say plainly that this gives the agent code of its own, so `guild submit` builds an image with Docker instead of sending only the agent's own files to Guild's shared runner.

---

## When you submit

Hand over to `/guild-submit`: the price, the version, `guild check`, signing in, submitting, and setting keys in the Studio.

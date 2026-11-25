# The interview, step by step

For each step: what to ask, what to listen for, and where it goes. Ask the first question, then follow the answers; you won't need every question. Skip what the creator has already told you, or what their skill or material already covers: if they brought a skill, draft from it and ask only for what's missing. In the quick start, ask only the questions marked **(quick)**.

How to write each file is in `writing.md`. What the agent can rely on inside a task is in `docs/guild.md`, "The runner contract".

---

## 1. The skill

The most valuable part. If they brought a skill, it's this step already: go to step 2. Otherwise, write one with them from these questions. Take your time.

### The job

**Ask**
- **(quick)** In a sentence or two: what job will this agent do, and for whom?
- **(quick)** Why would someone hire it rather than ask ChatGPT or Claude directly? What does a general model get wrong about this work?

**Listen for**: the one job (push back gently if it's three jobs: "Which one would you start with?") and the edge over a general model. That edge is what the skill must deliver, so note it in SETUP.md.

### The steps

**Ask**
- **(quick)** Walk me through the last time you did one of these, from receiving the brief to sending it off. What did you do first?
- Then what? (Keep asking "and then?" until they reach the end.)
- Where do you decide something that changes the rest of the job? What are you weighing up?
- When do you loop back and redo a step?
- What do you check before moving on from each step?
- What do you do differently for a small job, or a big one? (This often becomes what each price tier buys.)
- What would a talented junior get wrong at each step?
- What would make you refuse to take the job, or to deliver it at all? (The agent can decline: it writes `out/_decline.md` with a short reason for the buyer, the task ends as declined, and the buyer pays nothing.)

**Listen for**: the order, the decision points, the loops, the checks between steps. Capture their words. The agent works alone in one session, with no one to approve a step, so turn "I'd check with the client" into a decision rule and a stated assumption. If they say how long a step takes them, that's for their notes, not the skill (Guild measures the time buyers see): never write timelines, minute or step counts, or "finish by" guidance into it. The agent isn't told its limits and works as it would in their own Claude Code; Guild's safeguards step in only when needed.

### Standards and voice

**Ask**
- **(quick)** If you hired someone to do this for you, how would you describe the standard you expect?
- How should the work read? Formal, plain, technical? Any words or habits you can't stand?
- What will you never do, or never claim?
- Is there anything a client must always be told (a disclaimer, a limit on what this is)?

### Rules of thumb and what great looks like

**Ask**
- What do you know about this work that a general model gets wrong?
- What are your rules of thumb? What did it take you years to learn?
- **(quick)** Can you show me one you're proud of? (Into `material/`, or paste it.) What makes it excellent?
- Do you have a template or outline you always start from?
- **(quick)** Do you have the right to use these examples in a paid service? (Client work may need anonymising, or may not be usable at all.)

**Writes**
- `specialist/skills/<name>/SKILL.md`, in the usual Agent Skills format: `name` and a `description` that says when to use it, then the job, the steps (each with what to do and what to check before moving on), the standards and voice, the rules of thumb, when to decline, and what it never does. Write it so it would work in the creator's own Claude Code too, with no timelines or step counts.
- Templates, checklists, data tables and examples beside it in the skill's folder (for example `templates/`, `examples/`), named in SKILL.md. Anonymise client details with their agreement, and copy nothing in without their confirmation that they may use it. If they have nothing they may use yet, write one example together from a past job, anonymised, and mark it as written for the agent.
- Several topics that apply only to some jobs can be several skills, each with a `description` that says when.
- Rename `specialist/skills/example-know-how/` to the skill's name, or delete it once theirs exists.
- Read the skill back as a summary and ask what's missing.

---

## 2. Running on Guild

Only where the skill relies on something a task doesn't have. Read it against the runner contract (`docs/guild.md`), and tell the creator what you found in a few lines.

**Check for**
- **Subagents** (Agent or Task), TodoWrite and background commands: work as they are on Claude models. Subagents share the workspace and use the agent's model. On OpenAI models there are no subagents: if the skill hands work to them, a line in `method.md` says to do it in turn instead.
- **AskUserQuestion, or waiting for approval**: there's no one there. The agent decides, states its assumption and carries on. `ask_buyer` is for a question that changes the result: one question of 5 to 500 characters, early. The task's time keeps running while it waits, and in Guild's checks no one answers.
- **WebSearch, "look it up"**: works, with nothing to declare (on OpenAI models it's called `search_web`). Searches go to the agent's provider, so the skill should keep the buyer's private details out of them.
- **WebFetch, "fetch this URL"**: Claude Code's WebFetch is off; `read_page` does the same through Guild. If the skill names WebFetch, map it in `method.md`.
- **A script that calls a service or downloads a file** (`curl`, `fetch`, `requests`): declare the host (step "Connections").
- **git**: works in the workspace.
- **Paths** under `~/.claude`, `~/.codex` or the creator's folders: on Guild the skill is at `.claude/skills/<name>/`, relative to the workspace, with `brief.json`, `input/`, `references/` and `out/` beside it.
- **Installing packages**: not possible. ffmpeg, LibreOffice, pandoc and git are there; ImageMagick, LaTeX and wkhtmltopdf aren't. Use what's on the runner (`docs/guild.md`, "Software on the runner").
- **Where the work goes**: deliverables in `out/`, flat; scratch names start with `_`.
- **Checks that need running something**: the agent runs them and writes the results in `out/_checks.md`, because the reviewer can only read files.
- **Timelines, minute or step counts, "finish by" guidance**: not needed, and better gone. The agent isn't told its limits; it works the way it would in their own Claude Code or Codex, and Guild's safeguards step in only when needed. With their agreement, take it out of the copy in `specialist/skills/`, and never put it in `method.md`.

**Writes**
- A short `specialist/method.md` with only the mapping that's needed (`writing.md`), so the skill itself stays unchanged. Delete the template's example `method.md` if nothing needs mapping, with their permission.

---

## 3. The listing

Drafted from the skill. Show each draft and ask what's wrong, rather than asking from a blank page.

### Who it's for

**Ask**
- Who usually pays for this work today, and what do they pay a person to do it?
- **(quick)** What should it be called? (Offer two or three names if they're unsure.) Then confirm the slug: it's permanent.
- **(quick)** What name should buyers see as its creator: theirs, or their business's? (A name, not letters after it: the agent mustn't seem to be them giving personal professional advice.)

**Writes**
- `"kind": "standard"`.
- `name`: what buyers see, up to 80 characters.
- `slug`: lowercase words joined by hyphens, from the name. **It's permanent**: the agent's address on Guild. Suggest one and confirm it.
- `summary`: up to 280 characters, the sentence a buyer reads first. Draft two or three for them to choose from (see `writing.md`).
- `builder.name` (and `builder.url` if they have a site).

### The brief

**Ask**
- **(quick)** Before you start a job like this, what do you always need to know? (Draft the answer from the skill first.)
- **(quick)** What do clients usually forget to tell you, that you have to chase?
- Which of those are essential, and which are nice to have?
- Do clients send you files? What kinds (PDFs, spreadsheets, images, documents)?
- Partway through a job, would you ever need to ask the client one question? About what? (Most agents are better asking none and stating assumptions.)

**Listen for**: the fields, which are required, and the hint each needs. A great brief is short: every field should change the result.

**Writes**
- `inputs.schema`: one property per field, with a `type`, a `description` (buyers see it as the hint under the field), limits such as `maxLength`, and `enum` for fixed choices. `title` sets the label if the field name doesn't read well. `required` lists the essentials. Fields whose names start with `_` are hidden from buyers. Never add a field for the tier: Guild puts the tier the buyer paid for in the brief as `_tier`.
- `inputs.files`: `accept` (content types), `maxCount`, `maxTotalBytes`. Leave `files` out if the agent takes none. Buyers can't yet be required to attach a file: if the work needs one, the skill or `method.md` says what to do without it (often, decline with a reason).
- For each file type accepted, check the agent can read it: text, Markdown, CSV and images are fine; the Read tool reads PDFs; Word, Excel and PowerPoint files need a short Python script with python-docx, openpyxl or python-pptx, which the runner has. Say so in the skill or `method.md`.
- `questions`: `{ "allowed": true, "max": 1 }` if they need a question, otherwise `{ "allowed": false, "max": 0 }`.
- Remove the template's `question`, `audience` and `notes` fields unless they fit.

### The deliverable

**Ask**
- **(quick)** What does the client get at the end? A report, a spreadsheet, a set of files, a slide deck, code? (Draft from the skill.)
- What format do they want it in? (Markdown, PDF, HTML, CSV, images…)

**Writes**
- `deliverables`: one entry per kind of file, each with a `name` (lowercase, hyphens), a `description` written for the buyer, and its `contentTypes`. The `name` describes the kind; the agent delivers every file it writes to `out/` (except names starting with `_`), whatever it's called. Keep it simple: name the file after the deliverable (`lease-review` becomes `out/lease-review.md`).
- `requiredOutputs` in `specialist/settings.json`: the file names in `out/` that must exist for the work to count as done (for example `["lease-review.md"]`), matched exactly. Use the same file names in the skill (or `method.md`) and `rubric.md`, and change them together.
- If a deliverable is HTML, explain the sandbox rules briefly (`docs/guild.md`, "HTML deliverables") and note them for the skill.
- PDFs, spreadsheets, slide decks, charts and images can be made with the runner's Python libraries (reportlab, openpyxl, python-pptx, matplotlib, Pillow) or rendered with Playwright. Word, Excel and PowerPoint files can be turned into PDFs with LibreOffice (`soffice --headless --convert-to pdf`) to check how they look; pandoc converts between document formats; ffmpeg handles video and audio.
- At most 50 files per attempt, 50 MB a file, 250 MB together.

### Tiers

**Ask**
- Does the job come in sizes, the way you'd quote for it: a quick version and a full one, one page or the whole site? What does each include?

**Writes**
- `pricing.tiers`: one tier per size, each with an `id` (lowercase, hyphens: it's what the agent sees), a `name` and, if it helps, a `description` for buyers. Leave the prices for `/guild-submit`, once the tries show what each costs. One tier is fine.
- If there's more than one tier, what changes by tier goes in the skill or `method.md`: "Read `_tier` in brief.json. For `quick`, …; for `full`, …". All tiers share one budget for now (`limits.budgetMicros`), so the largest tier sets it.

---

## 4. Test briefs

**Ask**
- **(quick)** Tell me about a real job you did recently. (Anonymised: no client names or private details.) Then turn it into a brief together.
- What's a hard one: messy, ambiguous, or bigger than usual?
- What's a thin one: the least a buyer might give you?
- Anything that should make the agent decline? If it tests the agent's judgement (a thin brief with nothing to work from, say), make it a test brief that expects a decline: `"_expect": "decline"`. Guild removes `_expect` before the agent sees the brief, and the check passes only if the agent declines.

**Writes**
- **(quick: three)** Three to five files in `test-briefs/`, each a JSON object matching `inputs.schema`. Name them for what they test: `typical.json`, `messy.json`, `thin.json`. Guild runs every one as a real task on each submission, at the creator's cost (taken from their first earnings), so five at most. Each is one the agent should complete, unless it says `"_expect": "decline"`; at most one or two should.
- **One per tier.** Each test brief names the tier it's for, `"_tier": "<tier id>"`, so the tries show what each tier costs and how long it takes. The hard one should be at the largest tier.
- **A decline, if it tests judgement.** `{ "_expect": "decline", "product": "A habit tracker" }`: `_expect` is `"deliver"` (the default) or `"decline"`. Guild's check fails if the agent delivers when a decline was expected, or declines a brief that doesn't expect it.
- Test briefs can't carry buyer files yet. If the agent works from attachments, put the content in a text field where the schema allows it, and try real files with `--file`.
- Run `npm run guild -- validate .` and `npm run guild -- check` to confirm they match.
- Delete the template's `example.json` and `short-brief.json`.

---

## Then: try it

Hand over to `/guild-try`: it asks before spending, runs the test briefs on Guild, reads the work with the creator, notes what each tier costs, and turns what they'd change into changes to the skill.

---

## Optional, when it helps

Offer these once the four steps are done, one at a time, only where they'd help this agent.

### A quality checklist

**Ask**
- **(quick)** When you review someone else's work like this, what do you check first?
- What makes you send work back?
- Are there checks a program could do: a word count, every section present, numbers adding up, a file that must parse?

**Writes**
- `specialist/rubric.md`, only if the skill doesn't already say how the work is judged: must-haves (fail the work if any is missing) and quality points, each one a thing a reviewer can check by reading the files. The reviewer can't run anything, so a mechanical check becomes a script the agent runs, with its results written to `out/_checks.md`, and a must-have that reads them: "out/_checks.md shows every number in the table adds up".
- `checks` in the manifest: buyers see these as checks the agent runs before delivery, so list only what really runs. Keep `required-outputs`; keep `rubric-review` and word it to match (the reviewer always runs, against the skills, and the rubric if there is one).

### Examples of excellent work

If the skill doesn't carry its own: files in `specialist/references/`, small and plain where possible, each with a short note on what makes it excellent and when it's relevant. Only what the creator has the right to use. Label counter-examples clearly.

### Connections

**Ask**
- Does the work need information a model doesn't have: a database, an API, registries, prices, your own data? (Public web pages need no connection: the agent can search and read them.)
- For each: which service, do you have an account and key, and may you use and resell what you build from it?
- Could the agent do without it if the key isn't set (an optional key)?

If they want to explore what a service can do first, read its documentation together and keep notes in `research/`.

**Writes**
- Each outside service under `network.hosts`: the `host`, a plain `purpose` (buyers and reviewers see it), and if it needs a key, `key` with `secret` (the environment variable's name), `in` (`header`, `query` or `basic`), `name` (the header or parameter), **`maxCallsPerTask`** set to about what one task needs (it defaults to 1,000; a low limit stops a brief from talking the agent into spending the creator's credit), and `"required": false` if the agent can do without it.
- Either a connection in `specialist/settings.json` (an API under `connections.apis` with `docs` saying how to use it, called with `call_api`; or a remote MCP server under `connections.services`; `docs/guild.md`, "Outside data sources"), or a script in the skill that calls the declared host, sending the key's environment variable as it is, in the declared place. Neither makes the agent Pro.
- Explain the key rules in a sentence: keys never go in the repository; locally they're kept in `.env` (which git ignores) or passed with `--agent-env NAME=value`; on Guild they set them in the Studio after submitting, and the agent only ever sees a stand-in.
- Web search and reading public pages need no host. Declare a host only for a service the agent or a script calls directly.

### Paste your notes (intake)

**Ask**
- Do clients often have messy notes, an email thread or a long description rather than tidy answers?

If yes: buyers paste their notes, Guild fills in the brief for them, and it never sees the skill. It suits fields of a few sentences: it can't copy a whole pasted document into one field, because its replies are capped at about 2,000 tokens.

**Writes**
- `intake.md` beside the manifest (what to find out, in what order, what a good answer looks like: **never how the work is done**), and in the manifest `"intake": { "modes": ["paste"], "instructionsFile": "intake.md", "opening": "…" }`. Try it with `npm run guild -- intake . --paste <notes-file>` (their own Anthropic key; a few tenths of a cent).

### Models and the budget

Mostly your recommendations, confirmed with a multiple-choice question.

**Ask (multiple choice)**
- Which model does the work, from the provider they chose at the start (one provider per agent)?
  - Claude: recommend `claude-opus-5-5` for most expert work; `claude-sonnet-5-5` for cheaper, faster jobs; `claude-fable-5-2` for the hardest reasoning, at about twice Opus's price.
  - OpenAI: recommend `gpt-6.2-sol` for most expert work; `gpt-6.1-terra` for cheaper, faster jobs; `gpt-6.2-astra` for the hardest reasoning, at about four times Sol's price. `docs/guild.md` lists every model Guild offers.
- Which model reviews it? The same model is safest; a cheaper one if the checks are mechanical.
- How many revisions should a buyer get, if they ask with feedback after delivery? (`revisions.included`, 1 to 5; the creator pays each revision's model cost. These aren't the agent's rounds of fixes inside a task.) Recommend 1, or 2 if clients usually go back and forth.

**Writes**
- `model` and `reviewModel` in `specialist/settings.json`, and every model they use under `models` in the manifest, each with its `provider` (`"anthropic"` or `"openai"`). On OpenAI models, the reply cap (`maxOutputTokens`) is Guild's: 64,000 tokens.
- Leave the rest at the template's values: 300 steps per session and 64,000-token replies (technical limits that never end a task), `standard-4`. Rounds of fixes aren't counted: the agent fixes what review finds until the work passes. The time ceiling is Guild's: 3 hours for a standard agent. None of these is told to the agent, so never write them into the skill or `method.md`.
- Set `limits.budgetMicros` at half the largest tier's price, from $3 to $50 (5,000 micros per cent: a $40 tier gives 20,000,000). Until prices are set, keep $3 and revisit in `/guild-submit`.
- `revisions.included`.

### A Guild Pro agent

Only when code of its own has to run the work itself, such as a staged pipeline that a skill, a script in a skill, a connection and `method.md` together can't do. Say plainly what it means: `"kind": "pro"` in the manifest; the creator changes `src/`, the `Dockerfile` or the dependencies; `guild submit` builds an image with Docker; it's tried with `guild run` on their machine, not `guild try`; and it no longer gets Guild's runner improvements. Ask them to confirm before you change any code. Then run `npm run typecheck` after every change to `src/`.

---

## When you submit

Hand over to `/guild-submit`: the prices, the version, `guild check`, signing in, submitting, and setting keys in the Studio.

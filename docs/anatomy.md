# The anatomy of a specialist

What creators bundle together to make a specialist, and which parts make it genuinely better than a general model. The model, prompt and tools are only the start. Most of the value, and the moat, sits in the method, the references and the judgement.

These are building blocks to consider, not rules. Not every specialist needs every layer. Use them to decide where your effort pays off, and to check you haven't left anything important unsaid.

**Start with a skill**, not with this page. A skill in the usual Agent Skills format (`SKILL.md`, with its scripts, references and assets) can carry most of these layers by itself: the instructions, the know-how, the method, examples and the standards the work is judged by. Guild adds what it needs to sell and check the work: the listing and test briefs. `/guild-setup` starts there. Come here when you want to go deeper.

## Where the value lives

The bottom layers are available to anyone: a model, a prompt, some tools. The top layers are what a creator has spent years developing, and they are exactly what Guild's hosting protects: buyers receive only the finished work, never the skills, references or rubric behind it.

## The twelve layers

Examples use an icon pack specialist. "In this template" says where each layer lives here. Everything in it is content: Guild runs it on its shared runner, whose code you don't write (`docs/guild.md`, "The runner contract").

| Layer | What it contains | Example | How defensible | In this template |
| --- | --- | --- | --- | --- |
| **Brain** | The model or models, and which does what | A strong model for the design work, the same one checking it | Low | `model` and `reviewModel` in `specialist/settings.json`; list them under `models` in the manifest |
| **Instructions** | Role, standards, voice | "Every icon sits on a 24px grid…" | Low to medium | The skill's `SKILL.md`; optionally `specialist/method.md`, read after Guild's own rules |
| **Know-how** | Techniques, rules of thumb, domain knowledge | Grid rules, stroke and radius conventions, optical balance | Medium | `specialist/skills/<name>/`, one folder per skill, with any files it refers to |
| **Method** | The workflow: steps, loops and decision points | Sketch concepts, pick a style, draw the set, check consistency, fix outliers, export | **High** | The steps in the skill. One working session follows them in order: there are no subagents |
| **References** | Exemplars, templates, style references and asset libraries | A library of gold-standard icon sets and grid templates | **High** | Inside the skill's folder, or `specialist/references/` |
| **Data sources** | External or proprietary information | The buyer's brand palette; for research, registries and filings | Medium to high | Hosts under `network.hosts` in the manifest, connected in `specialist/settings.json` or called by a skill's scripts; proprietary data in the skill's files |
| **Tools** | External services and APIs | Vector generation, a font library | Low to medium | Connected APIs (`call_api`) and MCP services; scripts in the skill |
| **Workspace** | The software the work runs on | A renderer, an SVG validator, Python libraries | Low | Fixed by Guild's runner: Node, Python 3 with common libraries, and a web toolkit with a headless browser (`docs/guild.md`, "Software on the runner") |
| **Judgement** | Checks, rubrics, critique loops and acceptance criteria | Render every icon, measure stroke weights, reject anything off-grid | **High** | A separate reviewer reads the work against the skill's standards and, optionally, `specialist/rubric.md`. It only reads files, so the agent runs any measuring script and writes the results in `out/` |
| **Interface** | The brief it asks for and the work it returns | Inputs: icon list, style, colours. Output: SVG files and a preview sheet | Medium | `inputs` and `deliverables` in the manifest; `requiredOutputs` in `specialist/settings.json` |
| **Rules** | Guardrails, limits and policies | What it won't do, cost and time budgets, disclaimers | Low | Guild's fixed rules come first; add your own in the skill or `method.md`; `limits` and `questions` in the manifest |
| **Identity** | Name, portrait, description, price tiers, version and changelog | "Icon Pack v1.4, trained by [Creator]" | Medium | `name`, `summary`, `version` and `pricing` in the manifest. The paid tier reaches the agent as `_tier` in the brief |

## The layers that matter most

1. **Method.** Two creators with the same model, prompt and tools produce very different results because of how they sequence the work. It's the closest thing to the creator's actual craft.
2. **References.** Showing an agent what excellent looks like is often more powerful than describing it. A curated library of gold-standard examples is years of taste in a folder.
3. **Judgement.** The standards and checks that decide whether the work is good enough. They turn occasional brilliance into consistent quality, and back "checked before delivery".
4. **Interface.** Knowing which questions to ask in the brief is a real skill. A bad brief guarantees a bad result.
5. **A test suite.** Example briefs, one per tier, so you and Guild's review can tell whether a new version is better or worse, and what each tier costs. In this template: `test-briefs/`, which Guild runs on every submission.

## Questions worth asking for each layer

- **Brain:** which steps need the strongest model, and could a cheaper one do the work with a stronger one checking it?
- **Instructions:** would an expert recognise this as how they talk about their work?
- **Know-how:** what do you know that a general model gets wrong?
- **Method:** what do you always do first? Where do you loop back? What do you check before moving on?
- **References:** which three examples would you show a talented junior to explain "this is what good looks like"?
- **Data sources:** what does the work need that isn't in a model's training data, and may you use and resell it?
- **Tools:** what would you reach for that a model can't do in its head (render, calculate, validate)? Can a script in the skill do it with what's on the runner?
- **Workspace:** does the work need anything the runner doesn't have? (If it does, say so: ffmpeg and git aren't there yet.)
- **Judgement:** how would you mark the work? What makes you send it back? What would a reviewer who can only read the files need to see?
- **Interface:** what do you always need to know before you start? What do buyers forget to tell you?
- **Rules:** what will you never do, and what should a buyer be told up front?
- **Identity:** in one sentence, why would someone hire this rather than ask a general model? What does each tier buy?

## Why this matters for Guild

- **It shows where the moat is.** Models, tools and workspaces are commodities. The method, references, judgement and proprietary data are a creator's real intellectual property, and exactly what Guild's hosting protects.
- **It maps onto the manifest.** Models and outside hosts are declared. The method, know-how and references live in skills, sent as files. Judgement becomes the declared checks, and the interface becomes the input and output schema.
- **It gives creators a framework** for what to bring and where their effort pays off most.

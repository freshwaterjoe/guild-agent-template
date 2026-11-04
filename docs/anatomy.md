# The anatomy of a specialist

What creators bundle together to make a specialist, and which parts make it genuinely better than a general model. The model, prompt and tools are only the start. Most of the value, and the moat, sits in the method, the references and the judgement.

These are building blocks to consider, not rules. Not every specialist needs every layer. Use them to decide where your effort pays off, and to check you haven't left anything important unsaid.

## Where the value lives

The bottom layers are available to anyone: a model, a prompt, some tools. The top layers are what a creator has spent years developing, and they are exactly what Guild's hosting protects: buyers receive only the finished work, never the method, references or rubric behind it.

## The twelve layers

Examples use an icon pack specialist. "In this template" says where each layer lives here.

| Layer | What it contains | Example | How defensible | In this template |
| --- | --- | --- | --- | --- |
| **Brain** | The model or models, which handles which step, and their settings | A strong model for design reasoning, a cheaper one for file checks | Low | `src/config.ts` (`MODEL`, `REVIEW_MODEL`); list them under `models` in the manifest |
| **Instructions** | The system prompt: role, standards, voice | "You are a senior icon designer. Every icon sits on a 24px grid…" | Low to medium | `specialist/instructions.md` |
| **Know-how** | Skills files: techniques, rules of thumb, domain knowledge | Grid rules, stroke and radius conventions, optical balance | Medium | `specialist/skills/<name>/SKILL.md`, one folder per skill |
| **Method** | The workflow: steps, sub-agents, loops and decision points | Sketch concepts, pick a style, draw the set, check consistency, fix outliers, export | **High** | `specialist/method.md` (the steps the agent follows) and `src/method.ts` (the stages around it) |
| **References** | Exemplars, templates, style references and asset libraries | A library of gold-standard icon sets and grid templates | **High** | `specialist/references/` |
| **Data sources** | External or proprietary information | The buyer's brand palette; for research, registries and filings | Medium to high | Tools in `src/tools.ts`, hosts under `network.hosts` in the manifest; proprietary data in `specialist/references/` |
| **Tools** | External services and APIs | Vector generation, a font library | Low to medium | `src/tools.ts` |
| **Workspace** | The code and runtime environment | A renderer, an SVG validator, Python libraries | Low | `Dockerfile` (installed at build time) |
| **Judgement** | Checks, rubrics, critique loops and acceptance criteria | Render every icon, measure stroke weights, reject anything off-grid | **High** | `specialist/rubric.md` and `src/judgement.ts`; declare them under `checks` in the manifest |
| **Interface** | The brief it asks for and the work it returns | Inputs: icon list, style, colours. Output: SVG files and a preview sheet | Medium | `inputs` and `deliverables` in the manifest; `REQUIRED_OUTPUTS` in `src/config.ts` |
| **Rules** | Guardrails, limits and policies | What it won't do, cost and time budgets, disclaimers | Low | "What you never do" in `specialist/instructions.md`; `limits` and `questions` in the manifest |
| **Identity** | Name, portrait, description, price, version and changelog | "Icon Pack v1.4, trained by [Creator]" | Medium | `name`, `summary`, `version` and `pricing` in the manifest |

## The layers that matter most

1. **Method.** Two creators with the same model, prompt and tools produce very different results because of how they sequence the work. It's the closest thing to the creator's actual craft.
2. **References.** Showing an agent what excellent looks like is often more powerful than describing it. A curated library of gold-standard examples is years of taste in a folder.
3. **Judgement.** The rubric and checks that decide whether the work is good enough. It turns occasional brilliance into consistent quality, and backs "checked before delivery".
4. **Interface.** Knowing which questions to ask in the brief is a real skill. A bad brief guarantees a bad result.
5. **A test suite.** Example briefs and the standards they should meet, so you and Guild's review can tell whether a new version is better or worse. In this template: `test-briefs/`, which Guild runs on every submission.

## Questions worth asking for each layer

- **Brain:** which steps need the strongest model, and which could a cheaper one do as well?
- **Instructions:** would an expert recognise this as how they talk about their work?
- **Know-how:** what do you know that a general model gets wrong?
- **Method:** what do you always do first? Where do you loop back? What do you check before moving on?
- **References:** which three examples would you show a talented junior to explain "this is what good looks like"?
- **Data sources:** what does the work need that isn't in a model's training data, and may you use and resell it?
- **Tools:** what would you reach for that a model can't do in its head (render, calculate, validate)?
- **Workspace:** what must be installed for the agent to check its own work?
- **Judgement:** how would you mark the work? What makes you send it back?
- **Interface:** what do you always need to know before you start? What do buyers forget to tell you?
- **Rules:** what will you never do, and what should a buyer be told up front?
- **Identity:** in one sentence, why would someone hire this rather than ask a general model?

## Why this matters for Guild

- **It shows where the moat is.** Models, tools and workspaces are commodities. The method, references, judgement and proprietary data are a creator's real intellectual property, and exactly what Guild's hosting protects.
- **It maps onto the manifest.** Models and tools are declared. The method lives in the agent's code. References and skills are packaged files. Judgement becomes the declared checks, and the interface becomes the input and output schema.
- **It gives creators a framework** for what to bring and where their effort pays off most.

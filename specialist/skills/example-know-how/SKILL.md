---
name: example-know-how
description: Techniques and rules of thumb for this specialist's craft. Use while planning, doing and checking the work.
---

<!--
The skill is the agent's expertise (docs/anatomy.md): one folder per skill,
each with a SKILL.md in the usual Agent Skills format. Every task gets them at
.claude/skills/<name>/, and the agent is told to use them for the job. A skill
can include scripts (Python 3 and Node are on the runner), checklists, templates
and assets, in folders up to 15 deep, and refer to them by path. Hidden files and
a skill's own node_modules/ aren't sent. Rename this folder and replace this
example with your own skill. Unlike method.md, a skill reaches the agent exactly
as written, this comment included, so delete it when you do.
-->

# Writing an analytical brief

## Structure

1. The answer, in one paragraph.
2. Why: the three to five points that carry the answer, strongest first.
3. What would change the answer.
4. Assumptions and gaps.

## Rules of thumb

- If a point needs a number to be convincing, either give the number with its basis or drop the point.
- One idea per paragraph. If a paragraph needs a "however", consider splitting it.
- Write the summary last; it's the part the buyer reads first.

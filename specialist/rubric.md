<!--
Judgement (docs/anatomy.md): the bar the work must clear before delivery. A
separate reviewer reads the work against this (src/judgement.ts), and the agent
revises until it passes. Write criteria a reviewer can check, not hopes.
Replace the examples below.
-->

# Rubric

## Must-haves (fail the work if any is missing)

- out/report.md answers the question in the brief, in its first paragraph.
- It is written for the audience the brief names.
- Every assumption is stated where it's made.
- No invented facts, figures, quotes or sources.
- Nothing in it contradicts the brief or the buyer's files.

## Quality (note anything below this standard as a problem to fix)

- Headings state conclusions, not just topics.
- Each section earns its place; nothing is padding.
- Plain, specific British English.

## How to judge

Read brief.json, any files in input/, then everything in out/ except files starting with "_". Pass the work only if every must-have holds. List each problem as one specific instruction the writer can act on, such as "Section 2 claims a 40% market share with no basis: remove it or state it as an estimate".

// The settings you'll most often change. Keep them in step with
// guild.manifest.json: Guild refuses models the manifest doesn't list, and
// holds the agent to the manifest's budget and deadline.

/** Does the work. Must be listed under `models` in the manifest. */
export const MODEL = "claude-opus-5-5";

/** Reviews the work against specialist/rubric.md before delivery. Also listed in the manifest. */
export const REVIEW_MODEL = "claude-opus-5-5";

/** Most steps (model replies) in one working session. */
export const MAX_TURNS = 60;

/** How many times the agent may revise after review finds problems. */
export const MAX_REVISIONS = 2;

/**
 * The most a single model reply may write. Guild reserves each call's
 * worst-case cost from the task's budget before it runs, so an uncapped call
 * (the model's maximum) can be refused once the budget runs low.
 */
export const MAX_OUTPUT_TOKENS = 16_000;

/** Files the agent must write to out/ for the work to count as done. */
export const REQUIRED_OUTPUTS = ["report.md"];

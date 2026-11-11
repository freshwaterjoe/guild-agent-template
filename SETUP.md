# Setting up your specialist

Where this agent has got to. The setup in Claude Code (`/guild-setup`) and the setup in your browser (`npm run setup`) both tick these off as you go, so you can stop at any time, carry on in a new session, or switch between them. You can also work through it by hand: each stage says which files to change, and `npm run guild -- check` tells you what's left.

Delete this file when everything's done.

## Stages

- [ ] 1. **The job**: name, slug, summary and builder in `guild.manifest.json`
- [ ] 2. **The brief**: `inputs`, `questions`, and optionally `intake` with `intake.md`
- [ ] 3. **The deliverable**: `deliverables`, and `requiredOutputs` in `specialist/settings.json`
- [ ] 4. **The method**: `specialist/method.md`
- [ ] 5. **Know-how**: `specialist/skills/`
- [ ] 6. **Standards and voice**: `specialist/instructions.md`
- [ ] 7. **References**: `specialist/references/`
- [ ] 8. **Judgement**: `specialist/rubric.md`, `src/judgement.ts`, `checks`
- [ ] 9. **Data and tools**: `network.hosts`, connections in `specialist/settings.json`, and only if needed `src/tools.ts` and the `Dockerfile`
- [ ] 10. **Models and limits**: `specialist/settings.json`, `models`, `limits`, `revisions`
- [ ] 11. **Test briefs**: three to five in `test-briefs/`
- [ ] 12. **First runs**: `npm run guild -- check --run`, results read and improved
- [ ] 13. **Price**: `pricing`
- [ ] 14. **Ready to submit**: `npm run guild -- check` clean, `version` set

## Notes

Decisions, costs from runs, and anything worth remembering between sessions.

## Still to do

Anything left open, marked `TODO:` in the files.

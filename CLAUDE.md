# Master Marketer - Claude Code Instructions

## Deployment

This project has TWO deployment targets that must BOTH be updated:

1. **Render** (Express API server) — auto-deploys on `git push` to main
2. **Trigger.dev** (background task workers) — requires `npx trigger.dev deploy`

**CRITICAL: Always use `npm run deploy` instead of `git push`.** This pushes to Render AND deploys Trigger.dev tasks in one command. If you only `git push`, any changes to prompts, task logic, or libraries used by Trigger tasks will NOT take effect until Trigger.dev is also deployed.

### Commands
- `npm run deploy` — push to git + deploy Trigger.dev (use this always)
- `npm run trigger:deploy` — deploy Trigger.dev only (if git is already pushed)

## Points Budget

The `points_budget` field sent by MiD App is a **per-month** number. Each month in the points plan gets its own full budget allocation. The quarterly total is `points_budget * 3`.

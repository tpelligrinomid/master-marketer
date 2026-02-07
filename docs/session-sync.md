# Master Marketer — Session Sync Document

> Created: 2026-02-06
> Purpose: Get a new Claude Code session up to speed after folder rename

## Project Overview

**Master Marketer** is a stateless AI-powered backend service that generates marketing content for B2B technology companies. It's called by the main platform (MiD App v1 + Lovable frontend) and never touches the database directly.

### Core Capabilities
1. **Ad Copy Generation** — LinkedIn ads, display/banner ads with visual direction for designers
2. **Document Intake** — PDFs, DOCX, markdown → structured JSON extraction
3. **Meeting Notes Analysis** — Transcripts → summaries, action items, decisions, sentiment

### Tech Stack
- Express.js + TypeScript (deployed on Render)
- Trigger.dev for async long-running tasks (Claude API calls)
- Claude API (Opus for generation, Sonnet for intake)
- Zod for input validation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MiD App v1                             │
│  (Orchestrator - handles Supabase, context assembly, RAG)   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Master Marketer                          │
│  (Stateless AI service - never touches database)            │
│                                                             │
│  Endpoints:                                                 │
│  - POST /api/intake/meeting-notes → async job               │
│  - GET /api/jobs/:jobId → poll for results                  │
│  - (future) POST /api/generate/ads                          │
│  - (future) POST /api/intake/document                       │
└─────────────────────────────────────────────────────────────┘
```

**Key principle**: Master Marketer is stateless. MiD App v1 assembles context from Supabase and sends it. Master Marketer processes and returns structured output.

---

## Directory Structure

```
master-marketer/
├── src/
│   ├── index.ts                 # Express entry point
│   ├── config/
│   │   ├── env.ts               # Env var validation (zod)
│   │   └── cors.ts              # CORS config
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── health.routes.ts     # GET /api/health
│   │   ├── intake.routes.ts     # POST /api/intake/meeting-notes
│   │   └── jobs.routes.ts       # GET /api/jobs/:jobId
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   └── auth.ts              # API key auth (x-api-key header)
│   ├── types/
│   │   ├── meeting-notes.ts     # Input/output types + Zod schemas
│   │   └── campaign-input.ts    # Ad generation input schema
│   ├── prompts/
│   │   ├── meeting-notes.ts     # Meeting analysis prompt
│   │   ├── system.ts            # B2B copywriter system prompt
│   │   ├── linkedin.ts          # LinkedIn ad prompt builder
│   │   ├── display.ts           # Display ad prompt builder
│   │   └── helpers.ts           # Context assembly utilities
│   └── lib/
│       ├── job-store.ts         # In-memory job store for async tracking
│       └── trigger.ts           # Trigger.dev client helper
├── trigger/
│   └── analyze-meeting-notes.ts # Trigger.dev task (calls Claude Opus)
├── data/
│   ├── ad-reference-library.json    # 28 curated B2B ad examples
│   └── visual-styles-library.json   # 12 proven visual formats
├── docs/
│   ├── architecture-summary.md
│   ├── sync-for-mid-app-v1.md
│   └── session-sync.md          # This file
├── trigger.config.ts
├── package.json
└── .env                         # Contains API keys (not committed)
```

---

## Current Implementation Status

### Completed
- [x] Express server scaffolding with health check
- [x] API key auth middleware
- [x] Ad generation types and prompts (LinkedIn, display)
- [x] Ad reference library (28 examples) and visual styles library (12 formats)
- [x] Meeting notes intake types (`src/types/meeting-notes.ts`)
- [x] Meeting notes prompt (`src/prompts/meeting-notes.ts`)
- [x] Trigger.dev task for meeting analysis (`trigger/analyze-meeting-notes.ts`)
- [x] Job store for async job tracking (`src/lib/job-store.ts`)
- [x] Intake routes (`POST /api/intake/meeting-notes`)
- [x] Jobs routes (`GET /api/jobs/:jobId`)

### In Progress — Trigger.dev Deploy
The folder rename is happening because Trigger.dev deploy fails with spaces in the path.

**After rename, run:**
```bash
npm install
npx trigger.dev@4.3.3 deploy
```

This will deploy the `analyze-meeting-notes` task to production so you don't need to run `npx trigger.dev dev` locally.

### Not Yet Built
- [ ] Ad generation endpoint (`POST /api/generate/ads`)
- [ ] Document intake endpoint (`POST /api/intake/document`)
- [ ] File upload handling (for PDFs, DOCX)
- [ ] Projects/briefs CRUD (commented out in routes, may not be needed if MiD App v1 handles this)

---

## Key Files to Read

1. **`trigger.config.ts`** — Trigger.dev project config
   - Project ref: `proj_gnaoyrrpmfvdbrxsyhzu`
   - maxDuration: 120 seconds

2. **`src/routes/intake.routes.ts`** — POST endpoint that validates input, triggers async task

3. **`src/routes/jobs.routes.ts`** — Polling endpoint that checks Trigger.dev run status

4. **`trigger/analyze-meeting-notes.ts`** — The actual Trigger.dev task that calls Claude Opus

5. **`src/prompts/meeting-notes.ts`** — Detailed prompt with sentiment rules, output structure

---

## Environment Variables (.env)

```
PORT=3000
API_KEY=your-api-key-here
ANTHROPIC_API_KEY=sk-ant-...
TRIGGER_SECRET_KEY=tr_dev_...
```

---

## Testing the Meeting Notes Endpoint

After Trigger.dev deploy succeeds:

```bash
# Start the Express server
npm run dev

# In another terminal, test the endpoint
curl -X POST http://localhost:3000/api/intake/meeting-notes \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "transcript": "Sarah: Let us discuss the launch timeline. We are targeting Thursday.\nMike: Creative is behind schedule, but we can make it work.\nSarah: Agreed. Mike owns the creative delivery by Wednesday.",
    "meeting_title": "Launch Sync",
    "meeting_date": "2026-02-06",
    "participants": ["Sarah", "Mike"]
  }'

# Response: { "jobId": "xxx", "status": "accepted", ... }

# Poll for results
curl http://localhost:3000/api/jobs/xxx \
  -H "x-api-key: YOUR_API_KEY"

# When complete, response includes full analysis with summary, action_items, decisions, sentiment
```

---

## Async Job Flow

```
1. POST /api/intake/meeting-notes
   └── Validates input with Zod
   └── Triggers "analyze-meeting-notes" task on Trigger.dev
   └── Creates job in jobStore with triggerRunId
   └── Returns { jobId, status: "accepted" }

2. Trigger.dev runs the task (10-60 seconds)
   └── Calls Claude Opus with meeting transcript
   └── Parses JSON response
   └── Returns MeetingNotesOutput

3. GET /api/jobs/:jobId
   └── Checks jobStore for cached result
   └── If not complete, queries Trigger.dev run status
   └── Returns { status, output? }
```

---

## Package Versions (Important)

Trigger.dev packages must be pinned to exact version to match CLI:

```json
{
  "@trigger.dev/sdk": "4.3.3",
  "@trigger.dev/build": "4.3.3"
}
```

Use `npx trigger.dev@4.3.3` (not `@latest`) to avoid version mismatch errors.

---

## Next Steps After Folder Rename

1. Rename folder: `Master Marketer v1` → `master-marketer`
2. Open new Claude Code session in renamed folder
3. Run `npm install`
4. Deploy to Trigger.dev: `npx trigger.dev@4.3.3 deploy`
5. Test the meeting notes endpoint
6. Continue building ad generation endpoint if needed

---

## Related Documentation

- `docs/architecture-summary.md` — Full architecture for MiD App v1 integration
- `docs/sync-for-mid-app-v1.md` — Sync doc sent to MiD App v1 session
- User also has: `docs/current-state.md`, `docs/rag-and-context-strategy.md`, `docs/platform-rebuild-plan.md`

---

## User Context

- User: Tristan Pelligrino (tristan.pelligrino@marketersindemand.com)
- Building marketing platform for their agency (Marketers in Demand)
- Two-service architecture: MiD App v1 (orchestrator) + Master Marketer (AI brain)
- Lovable frontend connects to MiD App v1
- Trigger.dev project already exists: "Master Marketer" (proj_gnaoyrrpmfvdbrxsyhzu)

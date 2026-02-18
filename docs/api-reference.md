# Master Marketer API Reference

## Base URL

Production: `https://master-marketer.onrender.com/api`

## Authentication

All requests require an `x-api-key` header.

## Callback (all routes)

All routes accept optional top-level fields that are stripped before validation:

| Field | Type | Description |
|-------|------|-------------|
| `callback_url` | `string` | Webhook URL — results POSTed here when task completes |
| `metadata` | `object` | Arbitrary metadata passed through to the callback |

---

## Route Map

### Generators (build from scratch using data + AI)

| Deliverable | Endpoint | Trigger Task | Input Schema |
|-------------|----------|-------------|--------------|
| Roadmap | `POST /api/generate/roadmap` | `generate-roadmap` | `RoadmapInputSchema` |
| Research | `POST /api/intake/research` | `generate-research` | `ResearchInputSchema` |
| SEO Audit | `POST /api/intake/seo_audit` | `generate-seo-audit` | `SeoAuditInputSchema` |
| Content Plan | `POST /api/intake/content_plan` | `generate-content-plan` | `ContentPlanInputSchema` |
| ABM Plan | `POST /api/intake/abm_plan` | `generate-abm-plan` | `AbmPlanInputSchema` |

> **Note:** Research, SEO Audit, Content Plan, and ABM Plan generators live under `/api/intake/` for historical reasons. Duplicate routes also exist at `/api/generate/seo-audit`, `/api/generate/content-plan`, and `/api/generate/abm-plan` (same behavior). Research has no `/api/generate/` equivalent.

### Reformatters (ingest existing document, restructure it)

| Deliverable | Endpoint | Trigger Task | Input Schema |
|-------------|----------|-------------|--------------|
| Roadmap | `POST /api/intake/roadmap` | `analyze-deliverable` | `DeliverableIntakeInputSchema` |
| Marketing Plan | `POST /api/intake/plan` | `analyze-deliverable` | `DeliverableIntakeInputSchema` |
| Creative Brief | `POST /api/intake/brief` | `analyze-deliverable` | `DeliverableIntakeInputSchema` |

### Other

| Operation | Endpoint | Trigger Task | Input Schema |
|-----------|----------|-------------|--------------|
| Meeting Notes | `POST /api/intake/meeting-notes` | `analyze-meeting-notes` | `MeetingNotesInputSchema` |
| Job Status | `GET /api/jobs/:jobId` | n/a | n/a |
| Health Check | `GET /api/health` | n/a | n/a |

---

## Payload Schemas

### Generate Roadmap

`POST /api/generate/roadmap`

Builds a new roadmap from research data, transcripts, and process library.

```json
{
  "client": {
    "company_name": "string (required)",
    "domain": "string (required)"
  },
  "research": {
    "full_document_markdown": "string (required) — the full research report markdown",
    "competitive_scores": {
      "<Company Name>": {
        "organic_seo": "number (1-10)",
        "social_media": "number (1-10)",
        "content_strategy": "number (1-10)",
        "paid_media": "number (1-10)",
        "brand_positioning": "number (1-10)",
        "overall": "number (1-10)"
      }
    }
  },
  "transcripts": ["string array of meeting transcripts (required)"],
  "process_library": [
    {
      "task": "string (required)",
      "description": "string (required)",
      "stage": "Foundation | Execution | Analysis (required)",
      "points": "number, positive (required)"
    }
  ],
  "points_budget": "number, positive (required)",
  "instructions": "string (optional)",
  "title": "string (optional)",
  "previous_roadmap": "object (optional) — previous quarter's roadmap output for iteration"
}
```

### Generate Research

`POST /api/intake/research`

Builds a new competitive research report from client/competitor data.

```json
{
  "client": {
    "company_name": "string (required)",
    "domain": "string (required)"
  },
  "competitors": [
    {
      "company_name": "string (required)",
      "domain": "string (required)"
    }
  ],
  "title": "string (optional)",
  "instructions": "string (optional)",
  "context": {
    "industry_description": "string (optional)",
    "solution_category": "string (optional)",
    "target_verticals": ["string array (optional)"]
  },
  "knowledge_base": {
    "primary_meetings": ["string array (optional)"],
    "other_meetings": ["string array (optional)"],
    "notes": ["string array (optional)"],
    "processes": ["string array (optional)"]
  },
  "rag_context": "string (optional) — legacy field, use knowledge_base instead"
}
```

### Generate SEO Audit

`POST /api/intake/seo_audit` (or `/api/generate/seo-audit`)

Builds a new SEO/AEO audit. See `src/types/seo-audit-input.ts` for full schema.

### Generate Content Plan

`POST /api/intake/content_plan` (or `/api/generate/content-plan`)

Builds a new content plan from roadmap + SEO audit + research. See `src/types/content-plan-input.ts` for full schema.

### Generate ABM Plan

`POST /api/intake/abm_plan` (or `/api/generate/abm-plan`)

Builds an Account-Based Marketing plan from roadmap, research, and client-specific channel/tech configuration. See `src/types/abm-plan-input.ts` for full schema and `docs/abm-plan-form-spec.md` for the frontend form spec.

```json
{
  "client": {
    "company_name": "string (required)",
    "domain": "string (required)"
  },
  "roadmap": "object (required) — full roadmap output, passthrough",
  "research": {
    "full_document_markdown": "string (required)",
    "competitive_scores": { "<Company>": { "organic_seo": 0, "...": "..." } }
  },
  "transcripts": ["string array"],
  "target_segments": [
    {
      "segment_name": "string (required)",
      "description": "string (required)",
      "estimated_account_count": "number, positive (required)",
      "tier": "tier_1 | tier_2 | tier_3 (required)"
    }
  ],
  "offers": [
    {
      "offer_name": "string (required)",
      "offer_type": "assessment | audit | demo | trial | consultation | report | case_study | webinar | toolkit | calculator | custom (required)",
      "funnel_stage": "top | middle | bottom (required)",
      "description": "string (optional)"
    }
  ],
  "channels": {
    "email": {
      "enabled": true,
      "platform": "smartlead | outreach | salesloft | apollo | instantly | other",
      "sending_domains": ["string array, min 1"],
      "daily_send_volume": "number, positive",
      "warmup_needed": "boolean",
      "sequences_count": "number, positive (optional)"
    },
    "linkedin_ads": {
      "enabled": true,
      "monthly_budget": "number, positive",
      "formats": ["sponsored_content | message_ads | conversation_ads | text_ads | document_ads | video_ads | lead_gen_forms"]
    },
    "display_ads": { "enabled": true, "platform": "...", "monthly_budget": "number", "retargeting": "boolean" },
    "direct_mail": { "enabled": true, "provider": "...", "budget_per_send": "number" },
    "events": { "enabled": true, "types": ["webinars | trade_shows | ..."], "annual_event_count": "number" },
    "website_intelligence": { "enabled": true, "platform": "factors_ai | rb2b | clearbit_reveal | leadfeeder | other" }
  },
  "tech_stack": {
    "crm": "hubspot | salesforce | pipedrive | other (required)",
    "marketing_automation": "hubspot | marketo | pardot | activecampaign | none | other (optional)",
    "data_enrichment": "clay | apollo | zoominfo | lusha | clearbit | other (required)",
    "intent_data": "factors_ai | bombora | 6sense | demandbase | g2 | none | other (optional)",
    "workflow_automation": "n8n | zapier | make | tray_io | none | other (optional)"
  },
  "monthly_ad_budget": "number, positive (optional) — combined LinkedIn + display ad spend",
  "sales_follow_up_sla_hours": "number, positive (optional, default 24)",
  "launch_timeline": "30_days | 60_days | 90_days (optional, default 60_days)",
  "instructions": "string (optional)",
  "title": "string (optional)"
}
```

**Channel validation:** At least one of `email` or `linkedin_ads` must be present. Each channel key is optional — only include channels that are enabled. Every enum field supports "other" with a companion `{field}_other` free-text string.

### Reformat Existing Document (Roadmap, Plan, Brief)

`POST /api/intake/roadmap` | `/api/intake/plan` | `/api/intake/brief`

Takes raw text (or a file URL) of an existing document and restructures it. Provide either `content` or `file_url` (at least one is required).

```json
{
  "content": "string (optional) — the full text content of the existing document",
  "file_url": "string (optional) — URL to a PDF, DOCX, or text file to fetch and parse",
  "context": {
    "contract_name": "string (required)",
    "industry": "string (required)",
    "additional_notes": "string (optional)"
  }
}
```

**File URL support:** When `file_url` is provided instead of `content`, the server fetches the file and extracts text server-side. Supported file types: `.pdf`, `.docx`, `.doc`, `.txt`, `.md`. If both fields are provided, `content` takes precedence.

### Meeting Notes

`POST /api/intake/meeting-notes`

Analyzes meeting transcripts. See `src/types/meeting-notes.ts` for full schema.

---

## Response Format (all async routes)

All generator and reformatter routes return `202 Accepted`:

```json
{
  "jobId": "uuid",
  "triggerRunId": "string",
  "status": "accepted",
  "message": "..."
}
```

Poll `GET /api/jobs/:jobId` for completion, or use `callback_url` for push delivery.

---

## Output Formats

| Deliverable | Output Type | Format |
|-------------|------------|--------|
| Research | `full_document_markdown` + `sections[]` | Narrative markdown |
| Roadmap | Structured JSON | Typed sections (target_market, brand_story, etc.) |
| SEO Audit | Structured JSON | Typed sections (technical_seo, keyword_landscape, etc.) |
| Content Plan | `full_document_markdown` + `sections[]` | Narrative markdown |
| ABM Plan | `full_document_markdown` + `sections[]` | Narrative markdown |

Research, Content Plan, and ABM Plan output narrative markdown documents. Roadmap and SEO Audit output structured JSON that frontends render into visual layouts.

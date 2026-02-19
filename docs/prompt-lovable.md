# Master Marketer API — Frontend Integration Reference for Lovable

You are the frontend for the Master Marketer platform. Your job is to render forms that collect user input, combine that input with engagement context data (client, research output, roadmap output, etc.), assemble a JSON payload, and POST it to the Master Marketer API.

## Connection Details

- **Base URL:** `https://master-marketer.onrender.com/api`
- **Auth:** Include `x-api-key` header on all requests.
- **All generation routes are async.** POST returns `202 Accepted` with `{ jobId, status: "accepted" }`. Poll `GET /api/jobs/:jobId` for completion, or include `callback_url` for push delivery.

Every payload can include these optional top-level fields (stripped before validation):

| Field | Type | Purpose |
|-------|------|---------|
| `callback_url` | string | Webhook URL — results POSTed here when complete |
| `metadata` | object | Arbitrary metadata passed through to callback |

---

## Endpoints You Call

### Generators (produce new deliverables)

| Deliverable | Endpoint |
|-------------|----------|
| Research | `POST /api/generate/research` |
| Roadmap | `POST /api/generate/roadmap` |
| SEO Audit | `POST /api/generate/seo-audit` |
| Content Plan | `POST /api/generate/content-plan` |
| ABM Plan | `POST /api/generate/abm-plan` |

### Reformatters (restructure an existing document)

| Deliverable | Endpoint |
|-------------|----------|
| Roadmap | `POST /api/intake/roadmap` |
| Marketing Plan | `POST /api/intake/plan` |
| Creative Brief | `POST /api/intake/brief` |

### Other

| Operation | Endpoint |
|-----------|----------|
| Meeting Notes | `POST /api/intake/meeting-notes` |
| Job Status | `GET /api/jobs/:jobId` |

---

## Forms & Payloads

Each generator has a form. Some fields are user-editable, others are auto-populated from the engagement context (client info, previously generated deliverables, transcripts). Auto-populated data should be shown as read-only badges/chips so the user knows what's attached.

---

### Form 1: Generate Research

**Endpoint:** `POST /api/generate/research`

**Auto-populated from engagement context (read-only):**
- `client` — `{ company_name, domain }`

**User-editable fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Competitors | repeatable card (1–4) | Yes (min 1) | Each: `company_name` (text), `domain` (text). Optional: `linkedin_handle`, `youtube_channel_id` |
| Industry Description | textarea | No | Goes into `context.industry_description` |
| Solution Category | text input | No | Goes into `context.solution_category` |
| Target Verticals | tag input | No | Goes into `context.target_verticals[]` |
| Title | text input | No | |
| Instructions | textarea | No | |

**Knowledge base fields** (optional, populated from engagement context):
- `knowledge_base.primary_meetings` — primary discovery meeting transcripts
- `knowledge_base.other_meetings` — other meeting transcripts
- `knowledge_base.notes` — written notes
- `knowledge_base.processes` — process descriptions

These are typically auto-populated rather than user-entered.

---

### Form 2: Generate Roadmap

**Endpoint:** `POST /api/generate/roadmap`

**Auto-populated from engagement context (read-only):**
- `client` — `{ company_name, domain }`
- `research` — `{ full_document_markdown, competitive_scores }` from the research output
- `transcripts` — array of meeting transcript strings
- `process_library` — array of `{ task, description, stage, points }` objects (min 1)

**User-editable fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Points Budget | number input | Yes | Per-month budget (positive number). Label: "Monthly Points Budget" |
| Title | text input | No | |
| Instructions | textarea | No | |

**Optional:** If iterating on a previous quarter, pass `previous_roadmap` (the full previous roadmap output object).

---

### Form 3: Generate SEO Audit

**Endpoint:** `POST /api/generate/seo-audit`

**Auto-populated from engagement context (read-only):**
- `client` — `{ company_name, domain }`

**User-editable fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Competitors | repeatable card (1–4) | Yes (min 1) | Each: `company_name` (text), `domain` (text) |
| Seed Topics | tag input | No | Keywords/topics to seed the research |
| Max Crawl Pages | number input | No | Default: 150. Min: 1, Max: 2000 |
| Title | text input | No | |
| Instructions | textarea | No | |

**Optional context:** If research has been generated, pass it as `research_context` — `{ full_document_markdown, competitive_scores }`.

---

### Form 4: Generate Content Plan

**Endpoint:** `POST /api/generate/content-plan`

**Auto-populated from engagement context (read-only):**
- `client` — `{ company_name, domain }`
- `competitors` — array of `{ company_name, domain }`
- `roadmap` — full roadmap output object
- `seo_audit` — full SEO audit output object
- `research` — `{ full_document_markdown, competitive_scores }`
- `transcripts` — array of transcript strings

**User-editable fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text input | No | |
| Instructions | textarea | No | |

**Optional:** `process_library` (same shape as roadmap), `previous_content_plan` (full previous output for iteration).

---

### Form 5: Generate ABM Plan

**Endpoint:** `POST /api/generate/abm-plan`

This is the most complex form. 7 field groups rendered as collapsible sections (all expanded by default).

**Auto-populated from engagement context (read-only badges):**
- `client` — `{ company_name, domain }`
- `roadmap` — full roadmap output object. Show badge: `{roadmap.title}` or "Roadmap attached"
- `research` — `{ full_document_markdown, competitive_scores }`. Show badge: "Research attached"
- `transcripts` — array of strings. Show badge: `{n} transcripts`

**User-editable field groups:**

#### Group 1: Target Segments
Repeatable cards, 1–6 entries. Show "Add Segment" button (disabled at 6). Show running total of estimated_account_count.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Segment Name | text input | Yes | |
| Description | textarea | Yes | |
| Estimated Account Count | number input | Yes | Positive integer |
| Tier | select | Yes | "Tier 1 (1:1)" → `tier_1`, "Tier 2 (1:Few)" → `tier_2`, "Tier 3 (1:Many)" → `tier_3` |

#### Group 2: Offer Strategy
Repeatable cards, 1–8 entries.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Offer Name | text input | Yes | |
| Offer Type | select | Yes | Assessment, Audit, Demo, Trial, Consultation, Report, Case Study, Webinar, Toolkit, Calculator, Custom → `assessment`, `audit`, `demo`, `trial`, `consultation`, `report`, `case_study`, `webinar`, `toolkit`, `calculator`, `custom` |
| Funnel Stage | select | Yes | "Top of Funnel" → `top`, "Middle of Funnel" → `middle`, "Bottom of Funnel" → `bottom` |
| Description | textarea | No | |

#### Group 3: Channels
6 collapsible toggle sections. When toggled ON, section expands to show config fields. When OFF, channel is omitted from payload.

**Validation:** At least one of Email or LinkedIn Ads must be enabled.

**Email** (`channels.email`):

| Field | Type | Required |
|-------|------|----------|
| Platform | select: SmartLead, Outreach, SalesLoft, Apollo, Instantly, Other | Yes |
| Platform (Other) | text input (shown if "Other") | Conditional |
| Sending Domains | tag input (min 1) | Yes |
| Daily Send Volume | number input | Yes |
| Warmup Needed | toggle | Yes (default off) |
| Sequences Count | number input | No |

Platform values: `smartlead`, `outreach`, `salesloft`, `apollo`, `instantly`, `other`.

**LinkedIn Ads** (`channels.linkedin_ads`):

| Field | Type | Required |
|-------|------|----------|
| Monthly Budget | currency input ($) | Yes |
| Ad Formats | multi-select checkboxes (min 1) | Yes |

Format values: `sponsored_content`, `message_ads`, `conversation_ads`, `text_ads`, `document_ads`, `video_ads`, `lead_gen_forms`.

**Display Ads** (`channels.display_ads`):

| Field | Type | Required |
|-------|------|----------|
| Platform | select: Google Display, Metadata.io, RollWorks, Terminus, Demandbase, Other | Yes |
| Monthly Budget | currency input ($) | Yes |
| Retargeting | toggle (default off) | Yes |

Platform values: `google_display`, `metadata_io`, `rollworks`, `terminus`, `demandbase`, `other`.

**Direct Mail** (`channels.direct_mail`):

| Field | Type | Required |
|-------|------|----------|
| Provider | select: Sendoso, Postal, Reachdesk, Alyce, Manual, Other | Yes |
| Budget Per Send | currency input ($) | Yes |

Provider values: `sendoso`, `postal`, `reachdesk`, `alyce`, `manual`, `other`.

**Events** (`channels.events`):

| Field | Type | Required |
|-------|------|----------|
| Event Types | multi-select checkboxes (min 1) | Yes |
| Annual Event Count | number input | Yes |

Type values: `webinars`, `trade_shows`, `field_events`, `executive_dinners`, `virtual_roundtables`, `workshops`.

**Website Intelligence** (`channels.website_intelligence`):

| Field | Type | Required |
|-------|------|----------|
| Platform | select: Factors.ai, RB2B, Clearbit Reveal, Leadfeeder, Other | Yes |

Platform values: `factors_ai`, `rb2b`, `clearbit_reveal`, `leadfeeder`, `other`.

For all channels/tech stack: when "Other" is selected, show a companion text input. The value goes into a `{field}_other` key in the payload.

#### Group 4: Tech Stack

| Field | Type | Required | Options → Values |
|-------|------|----------|-----------------|
| CRM | select | Yes | HubSpot → `hubspot`, Salesforce → `salesforce`, Pipedrive → `pipedrive`, Other → `other` |
| Marketing Automation | select | No | HubSpot → `hubspot`, Marketo → `marketo`, Pardot → `pardot`, ActiveCampaign → `activecampaign`, None → `none`, Other → `other` |
| Data Enrichment | select | Yes | Clay → `clay`, Apollo → `apollo`, ZoomInfo → `zoominfo`, Lusha → `lusha`, Clearbit → `clearbit`, Other → `other` |
| Intent Data | select | No | Factors.ai → `factors_ai`, Bombora → `bombora`, 6sense → `6sense`, Demandbase → `demandbase`, G2 → `g2`, None → `none`, Other → `other` |
| Workflow Automation | select | No | n8n → `n8n`, Zapier → `zapier`, Make → `make`, Tray.io → `tray_io`, None → `none`, Other → `other` |

#### Group 5: Program Settings

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Monthly Paid Ad Budget | currency input ($) | No | Hint: "Combined LinkedIn + display ad spend" |
| Sales Follow-up SLA | number input (hours) | No | Default: 24 |
| Launch Timeline | select | No | "30 days" → `30_days`, "60 days" → `60_days`, "90 days" → `90_days`. Default: `60_days` |

#### Group 6: Instructions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text input | No | |
| Instructions | textarea | No | Placeholder: "e.g. Focus on construction segment first..." |

**Payload assembly rules:**
- Only include channel objects that are toggled ON.
- Only include `_other` fields when the corresponding select is "other".
- Only include optional tech stack fields if the user selected a value.
- Omit `monthly_ad_budget`, `sales_follow_up_sla_hours`, `launch_timeline` if not provided.

---

### Form 6: Reformat Existing Document

**Endpoints:** `POST /api/intake/roadmap` | `POST /api/intake/plan` | `POST /api/intake/brief`

User selects which type of document they're reformatting. All three share the same form.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Document Type | select | Yes | Roadmap, Marketing Plan, Creative Brief — determines which endpoint to call |
| Content | textarea | Conditional | Full text of the existing document |
| File URL | text/file input | Conditional | URL to PDF, DOCX, DOC, TXT, or MD file |
| Contract Name | text input | Yes | |
| Industry | text input | Yes | |
| Additional Notes | textarea | No | |

At least one of Content or File URL is required. If both provided, Content takes precedence.

---

### Form 7: Meeting Notes

**Endpoint:** `POST /api/intake/meeting-notes`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Transcript | textarea or structured input | Yes | Plain string or array of `{ speaker, text }` entries |
| Meeting Title | text input | No | |
| Meeting Date | date picker | No | ISO date string |
| Participants | tag input | No | |
| Guidance | textarea | No | |

---

## Deliverable Pipeline

Deliverables build on each other. Show generation buttons only when upstream dependencies are available:

1. **Research** — always available. No upstream dependencies.
2. **Roadmap** — available when: research output exists, transcripts exist, process library exists.
3. **SEO Audit** — available when: client + competitors exist. Enhanced if research output exists.
4. **Content Plan** — available when: roadmap output, SEO audit output, and research output all exist.
5. **ABM Plan** — available when: roadmap output and research output exist.

When passing upstream deliverable outputs into a downstream generator payload, pass the entire output object as-is — do not extract or reshape it.

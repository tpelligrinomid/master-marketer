# ABM Plan — Frontend Form Spec

Target: Lovable (React + Tailwind). This form captures all configuration needed to generate an ABM plan. The API endpoint is `POST /api/generate/abm-plan`.

---

## Form Layout

7 field groups rendered as collapsible sections (all expanded by default). A "Generate ABM Plan" submit button at the bottom.

---

## Group 1: Client & Upstream Data

Read-only badges — auto-populated from the selected client/engagement.

| Field | Display | Source |
|-------|---------|--------|
| Client | Badge: `{company_name}` | Selected engagement |
| Roadmap | Badge: `{roadmap.title}` or "Roadmap attached" | Roadmap output |
| Research | Badge: `{research.title}` or "Research attached" | Research output |
| Transcripts | Badge: `{n} transcripts` | Transcript count |

These fields are not user-editable. They confirm which upstream deliverables will be sent in the payload.

---

## Group 2: Target Segments

Repeatable cards, 1-6 entries. Show an "Add Segment" button (disabled at 6). Show running total of `estimated_account_count` across all segments.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Segment Name | text input | Yes | e.g. "Data Center Builders" |
| Description | textarea | Yes | e.g. "GCs building $500M+ data centers" |
| Estimated Account Count | number input | Yes | Positive integer |
| Tier | select | Yes | Options: "Tier 1 (1:1)", "Tier 2 (1:Few)", "Tier 3 (1:Many)" |

Values map to: `tier_1`, `tier_2`, `tier_3`.

Each card has a delete button (hidden when only 1 card remains). Start with 1 empty card.

**Running total:** Below the cards, show: `Total target accounts: {sum}`.

---

## Group 3: Offer Strategy

Repeatable cards, 1-8 entries. Show an "Add Offer" button (disabled at 8).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Offer Name | text input | Yes | e.g. "Start with a Pilot Project" |
| Offer Type | select | Yes | Options below |
| Funnel Stage | select | Yes | "Top of Funnel", "Middle of Funnel", "Bottom of Funnel" |
| Description | textarea | No | Optional details about the offer |

**Offer Type options:** Assessment, Audit, Demo, Trial, Consultation, Report, Case Study, Webinar, Toolkit, Calculator, Custom.

Values map to: `assessment`, `audit`, `demo`, `trial`, `consultation`, `report`, `case_study`, `webinar`, `toolkit`, `calculator`, `custom`.

Funnel stage values map to: `top`, `middle`, `bottom`.

Each card has a delete button (hidden when only 1 card remains). Start with 1 empty card.

---

## Group 4: Channels

6 collapsible toggle sections. Each has a toggle switch at the top. When toggled ON, the section expands to reveal config fields. When OFF, the section is collapsed and that channel is omitted from the payload.

**Validation:** Show an inline error at the top of this group if neither Email nor LinkedIn Ads is enabled: _"At least one of Email or LinkedIn Ads must be enabled."_

### 4a. Email

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Platform | select | Yes | SmartLead, Outreach, SalesLoft, Apollo, Instantly, Other |
| Platform (Other) | text input | If "Other" | Shown only when "Other" selected |
| Sending Domains | tag input | Yes | At least 1. User types domain and presses Enter to add. |
| Daily Send Volume | number input | Yes | Positive integer |
| Warmup Needed | toggle/checkbox | Yes | Default: off |
| Sequences Count | number input | No | Positive integer if provided |

Platform values map to: `smartlead`, `outreach`, `salesloft`, `apollo`, `instantly`, `other`.

### 4b. LinkedIn Ads

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Monthly Budget | number input (currency) | Yes | Prefix with "$" |
| Ad Formats | multi-select checkboxes | Yes | At least 1. Options below |

**Format options:** Sponsored Content, Message Ads, Conversation Ads, Text Ads, Document Ads, Video Ads, Lead Gen Forms.

Values map to: `sponsored_content`, `message_ads`, `conversation_ads`, `text_ads`, `document_ads`, `video_ads`, `lead_gen_forms`.

### 4c. Display Ads

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Platform | select | Yes | Google Display, Metadata.io, RollWorks, Terminus, Demandbase, Other |
| Platform (Other) | text input | If "Other" | Shown only when "Other" selected |
| Monthly Budget | number input (currency) | Yes | Prefix with "$" |
| Retargeting | toggle/checkbox | Yes | Default: off |

Platform values map to: `google_display`, `metadata_io`, `rollworks`, `terminus`, `demandbase`, `other`.

### 4d. Direct Mail

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Provider | select | Yes | Sendoso, Postal, Reachdesk, Alyce, Manual, Other |
| Provider (Other) | text input | If "Other" | Shown only when "Other" selected |
| Budget Per Send | number input (currency) | Yes | Prefix with "$" |

Provider values map to: `sendoso`, `postal`, `reachdesk`, `alyce`, `manual`, `other`.

### 4e. Events

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Event Types | multi-select checkboxes | Yes | At least 1. Options below |
| Annual Event Count | number input | Yes | Positive integer |

**Event type options:** Webinars, Trade Shows, Field Events, Executive Dinners, Virtual Roundtables, Workshops.

Values map to: `webinars`, `trade_shows`, `field_events`, `executive_dinners`, `virtual_roundtables`, `workshops`.

### 4f. Website Intelligence

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Platform | select | Yes | Factors.ai, RB2B, Clearbit Reveal, Leadfeeder, Other |
| Platform (Other) | text input | If "Other" | Shown only when "Other" selected |

Platform values map to: `factors_ai`, `rb2b`, `clearbit_reveal`, `leadfeeder`, `other`.

---

## Group 5: Tech Stack

6 select dropdowns. 2 are required (CRM, Data Enrichment). Each has an "Other" option that reveals a companion text input.

| Field | Type | Required | Options |
|-------|------|----------|---------|
| CRM | select | Yes | HubSpot, Salesforce, Pipedrive, Other |
| Marketing Automation | select | No | HubSpot, Marketo, Pardot, ActiveCampaign, None, Other |
| Data Enrichment | select | Yes | Clay, Apollo, ZoomInfo, Lusha, Clearbit, Other |
| Intent Data | select | No | Factors.ai, Bombora, 6sense, Demandbase, G2, None, Other |
| Workflow Automation | select | No | n8n, Zapier, Make, Tray.io, None, Other |

CRM values: `hubspot`, `salesforce`, `pipedrive`, `other`.
Marketing automation values: `hubspot`, `marketo`, `pardot`, `activecampaign`, `none`, `other`.
Data enrichment values: `clay`, `apollo`, `zoominfo`, `lusha`, `clearbit`, `other`.
Intent data values: `factors_ai`, `bombora`, `6sense`, `demandbase`, `g2`, `none`, `other`.
Workflow automation values: `n8n`, `zapier`, `make`, `tray_io`, `none`, `other`.

When "Other" is selected for any field, show a text input labeled "{Field Name} (specify)" below it. The value goes into the `{field}_other` key in the payload.

---

## Group 6: Program Settings

3 optional fields.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Monthly Paid Ad Budget | number input (currency) | No | Label: "Monthly Paid Ad Budget ($)". Hint: "Combined LinkedIn + display ad spend" |
| Sales Follow-up SLA | number input | No | Label: "Sales Follow-up SLA (hours)". Default: 24. Hint: "Max hours before sales must follow up on MQL" |
| Launch Timeline | select | No | Options: "30 days", "60 days", "90 days". Default: "60 days" |

Launch timeline values map to: `30_days`, `60_days`, `90_days`.

---

## Group 7: Instructions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text input | No | Custom title for the ABM plan |
| Instructions | textarea | No | Placeholder: "e.g. Focus on construction segment first. Client already has warm relationships with DPR and Turner." |

---

## Payload Assembly

When the user clicks "Generate ABM Plan", assemble the JSON payload:

```json
{
  "client": { "company_name": "...", "domain": "..." },
  "roadmap": { ... },
  "research": { "full_document_markdown": "...", "competitive_scores": { ... } },
  "transcripts": ["...", "..."],
  "target_segments": [
    { "segment_name": "...", "description": "...", "estimated_account_count": 1000, "tier": "tier_1" }
  ],
  "offers": [
    { "offer_name": "...", "offer_type": "trial", "funnel_stage": "bottom", "description": "..." }
  ],
  "channels": {
    "email": { "enabled": true, "platform": "smartlead", "sending_domains": ["..."], "daily_send_volume": 80, "warmup_needed": true },
    "linkedin_ads": { "enabled": true, "monthly_budget": 1250, "formats": ["sponsored_content"] }
  },
  "tech_stack": {
    "crm": "hubspot",
    "data_enrichment": "clay"
  },
  "monthly_ad_budget": 1500,
  "sales_follow_up_sla_hours": 24,
  "launch_timeline": "60_days",
  "title": "...",
  "instructions": "..."
}
```

**Rules:**
- Only include channel objects that are toggled ON.
- Only include `_other` fields when the corresponding select is "other".
- Only include optional tech stack fields if user selected a value other than the placeholder.
- Omit `monthly_ad_budget`, `sales_follow_up_sla_hours`, `launch_timeline` if not provided / left at default empty.
- `client`, `roadmap`, `research`, `transcripts` are auto-populated from the engagement context — not user-editable in this form.

---

## Validation Summary

| Rule | Display |
|------|---------|
| At least 1 target segment | Disable submit, show error on Group 2 |
| At least 1 offer | Disable submit, show error on Group 3 |
| Email or LinkedIn Ads enabled | Inline error at top of Group 4 |
| CRM selected | Required field indicator on Group 5 |
| Data Enrichment selected | Required field indicator on Group 5 |
| All required fields within enabled channels | Standard required-field validation |

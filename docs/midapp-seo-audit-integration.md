# Mid App — SEO Audit Integration Spec

## Overview

The Mid App sits between the **Lovable frontend** and the **Master Marketer HTTP API**. For the SEO Audit feature, the Mid App needs to:

1. **Receive** a form submission from Lovable
2. **Call** the Master Marketer API at `POST /api/generate/seo-audit`
3. **Track** the job status via polling or callback
4. **Receive** the completed audit result via webhook callback from Master Marketer
5. **Store** the result and make it available to Lovable for rendering

The Mid App does **not** interact with Trigger.dev directly. Master Marketer owns that integration internally.

---

## Architecture

```
Lovable (Frontend)
    │
    ├─── POST /api/seo-audit ──────────► Mid App
    │                                      │
    │                                      ├─── POST /api/generate/seo-audit
    │                                      │         ──────────► Master Marketer API
    │                                      │                        │
    │                                      │                  (internally triggers
    │                                      │                   Trigger.dev task,
    │                                      │                   20-30 min processing)
    │                                      │                        │
    │    (poll GET /api/seo-audit/:id)     │                        │
    │◄──────────────────────────────────── │                        │
    │                                      │                        │
    │                                      │◄─── POST callback ────┘
    │                                      │     (webhook with full output)
    │                                      │
    │    GET /api/seo-audit/:id            │
    │◄──── { status: "completed", data } ──┘
    │
    └─── Renders audit viewer with data
```

---

## Step 1: Mid App Receives Form Data from Lovable

Lovable submits the input form to the Mid App.

**Request body from Lovable:**

```json
{
  "client": {
    "company_name": "Motion Agency",
    "domain": "motionagency.io"
  },
  "competitors": [
    { "company_name": "Rise25", "domain": "rise25.com" },
    { "company_name": "Content Allies", "domain": "contentallies.com" },
    { "company_name": "Sweet Fish Media", "domain": "sweetfishmedia.com" }
  ],
  "seed_topics": ["podcast marketing", "B2B content strategy"],
  "max_crawl_pages": 150,
  "instructions": "Focus on comparing podcast services",
  "title": "SEO/AEO Audit: Motion Agency"
}
```

All fields except `client` and `competitors` are optional. `competitors` must have 1-4 entries.

---

## Step 2: Mid App Calls Master Marketer API

The Mid App forwards the request to Master Marketer's HTTP API, adding `callback_url` and `metadata` so Master Marketer knows where to deliver results.

**Request to Master Marketer:**

```
POST https://<master-marketer-host>/api/generate/seo-audit
Headers:
  Content-Type: application/json
  X-API-Key: <master-marketer-api-key>
```

**Request body:**

```json
{
  "client": {
    "company_name": "Motion Agency",
    "domain": "motionagency.io"
  },
  "competitors": [
    { "company_name": "Rise25", "domain": "rise25.com" },
    { "company_name": "Content Allies", "domain": "contentallies.com" },
    { "company_name": "Sweet Fish Media", "domain": "sweetfishmedia.com" }
  ],
  "seed_topics": ["podcast marketing", "B2B content strategy"],
  "max_crawl_pages": 150,
  "instructions": "Focus on comparing podcast services",
  "title": "SEO/AEO Audit: Motion Agency",

  "callback_url": "https://<mid-app-host>/api/webhooks/mm-callback",
  "metadata": {
    "deliverable_id": "del_xyz",
    "contract_id": "con_456",
    "title": "SEO/AEO Audit: Motion Agency"
  }
}
```

The `callback_url` and `metadata` fields are **not** part of the SEO audit input — Master Marketer strips them before validation and uses them to configure webhook delivery. This is the same pattern used by research, roadmap, and all other deliverables.

**Response from Master Marketer (202 Accepted):**

```json
{
  "jobId": "uuid-from-master-marketer",
  "triggerRunId": "run_abc123",
  "status": "accepted",
  "message": "SEO/AEO audit generation started. Results will be delivered to callback_url when complete..."
}
```

The Mid App should store both `jobId` and `triggerRunId` — the `jobId` is used for polling Master Marketer's status endpoint, and `triggerRunId` can be used as a fallback lookup.

---

## Step 3: Polling for Status (Optional)

While the audit is running, the Mid App can optionally poll Master Marketer for status updates. This is useful if Lovable wants to show progress to the user.

**Request:**

```
GET https://<master-marketer-host>/api/jobs/<jobId>
Headers:
  X-API-Key: <master-marketer-api-key>
```

**Response while processing:**

```json
{
  "jobId": "uuid",
  "status": "processing",
  "progress": "Trigger.dev run status: RUNNING"
}
```

**Response when complete:**

```json
{
  "jobId": "uuid",
  "status": "complete",
  "output": {
    // ... full GeneratedSeoAuditOutput JSON
  }
}
```

**Response on failure:**

```json
{
  "jobId": "uuid",
  "status": "failed",
  "error": "Task failed: reason"
}
```

**Fallback endpoint** (if jobId is lost, e.g. after a Mid App restart):

```
GET https://<master-marketer-host>/api/jobs/by-run/<triggerRunId>
```

**Polling strategy for Lovable:** Poll Mid App every 10 seconds. Mid App can either proxy the poll to Master Marketer or serve from its own stored state (updated by the callback).

---

## Step 4: Receiving the Callback from Master Marketer

When the audit completes, Master Marketer POSTs the result to the `callback_url` provided in Step 2. This is the primary delivery mechanism — more reliable than polling.

**Request from Master Marketer to Mid App:**

```
POST https://<mid-app-host>/api/webhooks/mm-callback
Headers:
  Content-Type: application/json
  X-API-Key: <master-marketer-api-key>
```

**Success payload:**

```json
{
  "job_id": "uuid",
  "status": "completed",
  "deliverable_id": "del_xyz",
  "contract_id": "con_456",
  "title": "SEO/AEO Audit: Motion Agency",
  "output": {
    "content_raw": "",
    "content_structured": {
      // ... full GeneratedSeoAuditOutput (see Output Schema below)
    }
  }
}
```

**Key fields:**
- `output.content_structured` — the complete audit JSON. This is the data Lovable renders.
- `output.content_raw` — empty string for SEO audits (used for markdown-format deliverables like research reports).
- `deliverable_id`, `contract_id`, `title` — echoed back from the `metadata` the Mid App sent in Step 2.

**Failure payload:**

```json
{
  "job_id": "uuid",
  "status": "failed",
  "deliverable_id": "del_xyz",
  "contract_id": "con_456",
  "error": "Error message here"
}
```

**What the Mid App does on callback:**
1. Validate the `X-API-Key` header
2. Look up the job by `job_id`
3. If `status === "completed"`: store `output.content_structured` as the job result, update status
4. If `status === "failed"`: store the error, update status
5. Return 200 OK

Master Marketer retries the callback up to 3 times with exponential backoff if it doesn't get a 200.

---

## Step 5: Serving Results to Lovable

Lovable retrieves the completed audit from the Mid App.

**Response to Lovable when complete:**

```json
{
  "id": "job_abc123",
  "status": "completed",
  "created_at": "2026-02-14T05:00:00.000Z",
  "completed_at": "2026-02-14T05:28:00.000Z",
  "data": {
    // ... full GeneratedSeoAuditOutput JSON
  }
}
```

The `data` field is the `output.content_structured` from the callback, passed through to Lovable unchanged. Lovable already knows the schema and how to render every field.

---

## API Endpoints the Mid App Exposes

### To Lovable:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/seo-audit` | POST | Receive form submission, trigger audit via Master Marketer |
| `/api/seo-audit/:id` | GET | Check status / get completed result |
| `/api/seo-audit` | GET | List all audits (dashboard view) |

### From Master Marketer (webhook):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/mm-callback` | POST | Receive completed audit results |

---

## API Endpoints the Mid App Calls

### On Master Marketer:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate/seo-audit` | POST | Trigger a new audit (requires `X-API-Key`) |
| `/api/jobs/:jobId` | GET | Poll job status (optional, requires `X-API-Key`) |
| `/api/jobs/by-run/:triggerRunId` | GET | Fallback status lookup (requires `X-API-Key`) |

---

## Processing Timeline

The audit takes 20-30 minutes end to end. The phases are, in order:

1. `"Gathering SEO intelligence..."` — longest phase, ~15-20 min (site crawl, keyword data, backlinks, SERP analysis, AEO checks)
2. `"Analyzing technical SEO..."` — ~1-2 min (Claude call 1)
3. `"Analyzing keyword landscape and content gaps..."` — ~1-2 min (Claude call 2)
4. `"Analyzing SERP features and AI engine visibility..."` — ~1-2 min (Claude call 3)
5. `"Analyzing backlink profile and authority..."` — ~1-2 min (Claude call 4)
6. `"Building competitive search landscape..."` — ~1-2 min (Claude call 5)
7. `"Generating strategic recommendations..."` — ~1-2 min (Claude call 6)
8. `"Delivering results via callback..."` — seconds
9. `"Complete"`

---

## Input Validation Rules

The Mid App should validate before forwarding to Master Marketer (Master Marketer also validates, but catching errors early gives better UX):

| Field | Rule |
|-------|------|
| `client.company_name` | Required, non-empty string |
| `client.domain` | Required, non-empty string |
| `competitors` | Array of 1-4 entries, each with `company_name` and `domain` |
| `seed_topics` | Optional array of strings |
| `max_crawl_pages` | Optional number, 1-2000, defaults to 150 |
| `instructions` | Optional string |
| `title` | Optional string, auto-generated as `"SEO/AEO Audit: {company_name}"` if omitted |
| `research_context` | Optional — only present when a prior research report exists for this client. Contains `full_document_markdown` (the research report text) and `competitive_scores` (a map of domain → score object). The Mid App should pass this through if available. |

---

## Complete Output Schema

This is the full TypeScript type for the audit output. This is what arrives in the callback's `output.content_structured` field and what gets stored and served to Lovable.

Lovable already has this schema and knows how to render every field — the Mid App just needs to store it and pass it through.

```typescript
interface GeneratedSeoAuditOutput {
  type: "seo_audit";
  title: string;
  summary: string;

  technical_seo: {
    section_description: string;
    health_score: number;                    // 0-100
    pages_crawled: number;
    critical_issues: Array<{
      issue: string;
      severity: "critical" | "high" | "medium" | "low";
      affected_pages: number;
      description: string;
      recommendation: string;
    }>;
    schema_inventory: Array<{
      schema_type: string;
      pages_count: number;
      status: "implemented" | "missing" | "incomplete";
      recommendation?: string;
    }>;
    core_web_vitals: Array<{
      url: string;
      lcp: number | null;
      fid: number | null;
      cls: number | null;
      inp: number | null;
      performance_score: number | null;
      rating: "good" | "needs_improvement" | "poor";
    }>;
    crawlability_summary: string;
    indexability_summary: string;
    mobile_readiness_summary: string;
    technical_verdict: {
      recommendation: "proceed_to_content" | "technical_audit_first" | "parallel_workstreams";
      rationale: string;
      deep_audit_areas?: string[];
    };
  };

  keyword_landscape: {
    section_description: string;
    total_ranked_keywords: number;
    top_3_keywords: number;
    top_10_keywords: number;
    top_50_keywords: number;
    estimated_organic_traffic: number;
    keyword_clusters: Array<{
      cluster_name: string;
      intent: string;
      business_relevance: "core" | "adjacent" | "vanity";
      relevance_rationale: string;
      keywords: Array<{
        keyword: string;
        position: number;
        search_volume: number;
        difficulty?: number;
        url?: string;
      }>;
      total_traffic_potential: number;
      opportunity_score: number;
    }>;
    top_performers: Array<{
      keyword: string;
      position: number;
      search_volume: number;
      url: string;
      trend: "rising" | "stable" | "declining";
      business_relevance: "core" | "adjacent" | "vanity";
    }>;
    ranking_distribution_summary: string;
  };

  content_gap: {
    section_description: string;
    total_gap_keywords: number;
    high_value_gaps: ContentGapOpportunity[];
    quick_wins: ContentGapOpportunity[];
    strategic_gaps: ContentGapOpportunity[];
    gap_analysis_summary: string;
  };

  serp_features_aeo: {
    section_description: string;
    snippet_opportunities: Array<{
      keyword: string;
      search_volume: number;
      current_snippet_holder?: string;
      client_position?: number;
      snippet_type: string;
      optimization_recommendation: string;
    }>;
    paa_opportunities: Array<{
      question: string;
      parent_keyword: string;
      search_volume?: number;
      currently_answered_by?: string;
    }>;
    ai_overview_presence: Array<{
      keyword: string;
      ai_overview_present: boolean;
      client_referenced: boolean;
      competitors_referenced: string[];
      optimization_opportunity: string;
    }>;
    llm_visibility: Array<{
      engine: string;
      queries_tested: number;
      brand_mentioned_count: number;
      mention_rate: number;
      competitors_mentioned: Record<string, number>;
      key_findings: string[];
    }>;
    serp_features_summary: string;
    aeo_readiness_score: number;
    aeo_recommendations: string[];
  };

  backlink_profile: {
    section_description: string;
    total_backlinks: number;
    referring_domains: number;
    dofollow_ratio: number;
    domain_authority?: number;
    spam_score?: number;
    anchor_distribution: Array<{
      category: string;
      percentage: number;
      examples: string[];
    }>;
    competitor_comparison: Array<{
      company_name: string;
      domain: string;
      total_backlinks: number;
      referring_domains: number;
      domain_rank?: number;
      dofollow_ratio: number;
    }>;
    gap_opportunities: Array<{
      referring_domain: string;
      domain_rank?: number;
      links_to_competitors: string[];
      acquisition_difficulty: "easy" | "medium" | "hard";
      recommendation: string;
    }>;
    backlink_health_summary: string;
    link_building_priorities: string[];
  };

  competitive_search: {
    section_description: string;
    client_profile: SearchProfile;
    competitor_profiles: SearchProfile[];
    competitive_positioning_summary: string;
    differentiation_opportunities: string[];
  };

  strategic_recommendations: {
    section_description: string;
    quick_wins: StrategicRecommendation[];
    medium_term: StrategicRecommendation[];
    long_term: StrategicRecommendation[];
    executive_summary: string;
  };

  metadata: {
    model: string;
    version: number;
    generated_at: string;
    domain_audited: string;
    competitors_analyzed: string[];
    intelligence_errors: string[];
  };
}

// Shared sub-types used above:

interface ContentGapOpportunity {
  keyword: string;
  search_volume: number;
  difficulty?: number;
  intent: string;
  competitor_positions: Record<string, number>;
  estimated_traffic_value: number;
  priority: "high" | "medium" | "low";
  rationale: string;
}

interface SearchProfile {
  company_name: string;
  domain: string;
  total_ranked_keywords: number;
  top_10_keywords: number;
  estimated_traffic: number;
  domain_authority?: number;
  top_content_categories: string[];
  strengths: string[];
  weaknesses: string[];
}

interface StrategicRecommendation {
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  timeframe: string;
  category: "technical" | "content" | "backlinks" | "aeo" | "competitive";
  kpi: string;
}
```

---

## Summary of Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Lovable** | Input form, polling Mid App for status, rendering the audit viewer |
| **Mid App** | Receives form data from Lovable, calls Master Marketer HTTP API, receives callback, stores results, serves results to Lovable |
| **Master Marketer API** | Validates input, triggers Trigger.dev task, manages job state, delivers results via callback webhook |
| **Trigger.dev (internal to Master Marketer)** | Crawls sites, gathers intelligence from 5+ APIs, runs 6 Claude analysis calls, assembles output |

The Mid App is a **thin orchestration layer**. It does not process or transform the audit output — it stores it as-is from the callback and serves it as-is to Lovable. The Mid App never talks to Trigger.dev directly. All communication goes through Master Marketer's HTTP API, following the same pattern as research, roadmap, and all other deliverables.

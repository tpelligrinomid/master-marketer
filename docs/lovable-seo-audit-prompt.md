# SEO/AEO Audit — Lovable Frontend Spec

## Overview

Build two views for the SEO/AEO Audit feature:

1. **Input Form** — A multi-step form to configure and trigger an audit
2. **Audit Viewer** — A premium, data-rich visual report that renders the structured JSON output

Both should feel like a $15K consulting deliverable from a top-tier agency. Think: blend of an Ahrefs dashboard, a McKinsey strategy deck, and a polished data visualization.

---

## Part 1: Input Form

The input form collects the information needed to trigger an SEO audit. The backend expects the following JSON payload:

```typescript
interface SeoAuditInput {
  client: {
    company_name: string;  // e.g. "Motion Agency"
    domain: string;        // e.g. "motionagency.io"
  };
  competitors: Array<{
    company_name: string;  // e.g. "Sweet Fish Media"
    domain: string;        // e.g. "sweetfishmedia.com"
  }>;                      // 1-4 competitors required
  seed_topics?: string[];  // Optional focus keywords/topics
  max_crawl_pages?: number; // 1-2000, default 150
  instructions?: string;   // Optional free-text instructions
  title?: string;          // Optional custom report title
}
```

### Form Layout

Use a clean, card-based layout. Group fields logically. The form should feel fast — a user should be able to fill it out in under 60 seconds.

#### Section 1: Your Company

Two fields side by side:
- **Company Name** — text input, required. Placeholder: "Acme Corp"
- **Domain** — text input, required. Placeholder: "acmecorp.com". Auto-strip `https://` and trailing `/` if pasted.

#### Section 2: Competitors

A dynamic list of 1-4 competitor rows. Each row has:
- **Company Name** — text input, required
- **Domain** — text input, required
- **Remove button** (trash icon) — only shown if more than 1 competitor

Below the list:
- **"+ Add Competitor"** button — disabled when 4 competitors already exist
- Start with 1 empty competitor row. Show subtle helper text: "Add up to 4 competitors to analyze."

#### Section 3: Advanced Options (collapsible, collapsed by default)

- **Seed Topics** — tag input or comma-separated text. Helper text: "Optional focus keywords or topics to prioritize in the analysis." Placeholder: "podcast marketing, B2B content strategy"
- **Max Pages to Crawl** — number input with slider, range 1-2000, default 150. Helper text: "More pages = deeper analysis but longer processing time (~10s per page)."
- **Special Instructions** — textarea, optional. Placeholder: "Focus on comparing our podcast services to competitors..."
- **Report Title** — text input, optional. Placeholder: "Auto-generated from company name if blank."

#### Submit

- Large primary CTA button: **"Generate SEO Audit"**
- After submit, show a status card with:
  - Progress spinner
  - Status text that updates (these come from the backend as the audit runs):
    - "Crawling website..." → "Gathering keyword data..." → "Analyzing competitors..." → "Analyzing technical SEO..." → "Analyzing keywords and content gaps..." → "Analyzing SERP features..." → "Analyzing backlinks..." → "Building competitive landscape..." → "Generating recommendations..."
  - Elapsed time counter
  - Note: "Audits typically take 20-30 minutes to complete. You'll be notified when it's ready."

### Form Validation

- Company name and domain are required for client and all competitors
- At least 1 competitor required
- Domain should look like a valid domain (contains a dot, no spaces)
- max_crawl_pages must be 1-2000 if provided

---

## Part 2: Audit Viewer

The audit viewer renders the structured JSON output as an interactive, visual report. The backend returns this shape:

```typescript
interface GeneratedSeoAuditOutput {
  type: "seo_audit";
  title: string;           // e.g. "SEO/AEO Audit: Motion Agency"
  summary: string;         // Executive summary paragraph

  technical_seo: TechnicalSeoSection;
  keyword_landscape: KeywordLandscapeSection;
  content_gap: ContentGapSection;
  serp_features_aeo: SerpFeaturesAeoSection;
  backlink_profile: BacklinkProfileSection;
  competitive_search: CompetitiveSearchSection;
  strategic_recommendations: StrategicRecommendationsSection;

  metadata: {
    model: string;
    version: number;
    generated_at: string;            // ISO timestamp
    domain_audited: string;
    competitors_analyzed: string[];
    intelligence_errors: string[];
  };
}
```

### Design Philosophy

- **Data-first, not text-first.** The JSON is full of numbers, scores, arrays, and categorized data. Render as charts, gauges, heatmaps, and cards — not paragraphs.
- **Scrollytelling structure.** The report flows vertically through 7 sections, each with its own visual treatment. Think of each section as a "slide" in a premium deck.
- **Progressive disclosure.** Show the headline metric big and bold, with expandable detail underneath. Don't overwhelm — let the user click to dig deeper.
- **Competitor comparisons everywhere.** When data includes competitor context, always show it visually side-by-side.

### Color System

Use consistently throughout:
- **Severity:** critical = red-600, high = orange-500, medium = amber-400, low = green-500
- **Business relevance:** core = blue-600, adjacent = purple-500, vanity = gray-400
- **Ratings:** good = emerald-500, needs_improvement = amber-500, poor = red-500
- **Verdict:** proceed_to_content = emerald, technical_audit_first = red, parallel_workstreams = amber
- **Effort:** low = green, medium = amber, high = red
- **Impact:** low = gray, medium = amber, high = emerald
- **Priority:** high = red-500, medium = amber-400, low = gray-400

---

### Report Header

- **Title** rendered large (e.g. "SEO/AEO Audit: Motion Agency")
- **Generated date** formatted nicely (e.g. "February 14, 2026")
- **Domain audited** as a clickable link
- **Competitors analyzed** as a row of domain chips/badges
- **Intelligence errors** — if any, show a subtle warning banner. Usually empty.
- **Executive summary** (`summary` field) rendered as a styled callout/card below the header — this is the "TL;DR" that a CEO reads.

### Section Navigation

Sticky sidebar or top tab bar with section names:
1. Technical SEO
2. Keyword Landscape
3. Content Gaps
4. SERP & AEO
5. Backlinks
6. Competitive Landscape
7. Recommendations

Clicking a section scrolls to it. Active section highlights as user scrolls.

---

### Section 1: Technical SEO

```typescript
interface TechnicalSeoSection {
  section_description: string;
  health_score: number;                    // 0-100
  pages_crawled: number;
  critical_issues: CriticalIssue[];
  schema_inventory: SchemaInventoryItem[];
  core_web_vitals: CoreWebVitals[];
  crawlability_summary: string;
  indexability_summary: string;
  mobile_readiness_summary: string;
  technical_verdict: {
    recommendation: "proceed_to_content" | "technical_audit_first" | "parallel_workstreams";
    rationale: string;
    deep_audit_areas?: string[];
  };
}

interface CriticalIssue {
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  affected_pages: number;
  description: string;
  recommendation: string;
}

interface SchemaInventoryItem {
  schema_type: string;
  pages_count: number;
  status: "implemented" | "missing" | "incomplete";
  recommendation?: string;
}

interface CoreWebVitals {
  url: string;
  lcp: number | null;    // Largest Contentful Paint in ms
  fid: number | null;    // First Input Delay in ms
  cls: number | null;    // Cumulative Layout Shift (unitless)
  inp: number | null;    // Interaction to Next Paint in ms
  performance_score: number | null;  // 0-100
  rating: "good" | "needs_improvement" | "poor";
}
```

**Layout:**

1. **Hero metric:** Health score as a large circular gauge (0-100). Color: <60 red, 60-80 amber, 80+ green. Show `pages_crawled` as a subtitle: "150 pages crawled."

2. **Technical Verdict banner** — full-width colored banner:
   - `proceed_to_content` → green: "Ready for content strategy"
   - `technical_audit_first` → red: "Technical fixes needed first"
   - `parallel_workstreams` → amber: "Proceed with parallel workstreams"
   - Show `rationale` text below the verdict
   - Show `deep_audit_areas` as pills/tags

3. **Critical Issues** — card list sorted by severity. Each card:
   - Left: severity badge (colored dot + label)
   - Title: issue name
   - Subtitle: "Affects N pages"
   - Expandable: description and recommendation

4. **Core Web Vitals** — table with one row per URL:
   - URL (truncated, with tooltip for full)
   - LCP (colored: <2500ms green, 2500-4000 amber, >4000 red)
   - CLS (colored: <0.1 green, 0.1-0.25 amber, >0.25 red)
   - Performance score (colored gauge)
   - Rating badge

5. **Schema Inventory** — grid of small cards, one per schema type:
   - Icon per type (Organization, Article, Service, FAQ, etc.)
   - Status badge: implemented=green, missing=red, incomplete=amber
   - Pages count
   - Expandable recommendation

6. **Summary cards** — three cards side by side for crawlability_summary, indexability_summary, mobile_readiness_summary. Use icons (spider, index, mobile phone).

---

### Section 2: Keyword Landscape

```typescript
interface KeywordLandscapeSection {
  section_description: string;
  total_ranked_keywords: number;
  top_3_keywords: number;
  top_10_keywords: number;
  top_50_keywords: number;
  estimated_organic_traffic: number;
  keyword_clusters: KeywordCluster[];
  top_performers: TopPerformer[];
  ranking_distribution_summary: string;
}

interface KeywordCluster {
  cluster_name: string;
  intent: string;                           // informational, commercial, transactional, navigational
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
  opportunity_score: number;                // 1-10
}

interface TopPerformer {
  keyword: string;
  position: number;
  search_volume: number;
  url: string;
  trend: "rising" | "stable" | "declining";
  business_relevance: "core" | "adjacent" | "vanity";
}
```

**Layout:**

1. **Hero metrics row** — four stat cards:
   - Total Ranked Keywords (large number)
   - Top 10 Rankings (with colored ring: more = greener)
   - Top 3 Rankings
   - Estimated Monthly Traffic (formatted with commas)

2. **Ranking Distribution** — horizontal stacked bar or funnel chart:
   - Segments: Top 3, 4-10, 11-50, 50+
   - Shows how keywords are distributed across ranking tiers

3. **Keyword Clusters** — expandable card list, sorted by opportunity_score (highest first):
   - Each card header shows:
     - Cluster name
     - Intent badge (colored by intent type)
     - Business relevance badge (core=blue, adjacent=purple, vanity=gray)
     - Opportunity score (1-10 as a small filled bar or stars)
     - Traffic potential number
   - Expanded: table of keywords with position, volume, difficulty, URL
   - Show `relevance_rationale` as a subtitle

4. **Top Performers table:**
   - Keyword, Position, Volume, Trend (arrow icon: up=green, flat=gray, down=red), Business Relevance badge, URL

5. **Ranking distribution summary** — styled text block below.

---

### Section 3: Content Gap Analysis

```typescript
interface ContentGapSection {
  section_description: string;
  total_gap_keywords: number;
  high_value_gaps: ContentGapOpportunity[];
  quick_wins: ContentGapOpportunity[];
  strategic_gaps: ContentGapOpportunity[];
  gap_analysis_summary: string;
}

interface ContentGapOpportunity {
  keyword: string;
  search_volume: number;
  difficulty?: number;
  intent: string;
  competitor_positions: Record<string, number>;  // domain → position
  estimated_traffic_value: number;
  priority: "high" | "medium" | "low";
  rationale: string;
}
```

**Layout:**

1. **Hero metric:** "N keyword gaps identified" as a large number.

2. **Three tabbed or stacked sub-sections:**
   - **High Value Gaps** (red/orange accent) — biggest revenue opportunities
   - **Quick Wins** (green accent) — low effort, fast results
   - **Strategic Gaps** (blue accent) — long-term positioning

3. **Each gap rendered as a card:**
   - Keyword (large)
   - Search volume + difficulty (if available) side by side
   - Intent badge
   - Priority badge (high=red, medium=amber, low=gray)
   - Estimated traffic value (as dollar icon or formatted number)
   - Competitor positions: show which competitors rank and at what position (small domain badges with position numbers)
   - Rationale as expandable text

4. **Gap analysis summary** — styled callout at bottom.

---

### Section 4: SERP Features & AEO

```typescript
interface SerpFeaturesAeoSection {
  section_description: string;
  snippet_opportunities: SnippetOpportunity[];
  paa_opportunities: PaaOpportunity[];
  ai_overview_presence: AiOverviewPresence[];
  llm_visibility: LlmVisibility[];
  serp_features_summary: string;
  aeo_readiness_score: number;         // 0-100
  aeo_recommendations: string[];
}

interface SnippetOpportunity {
  keyword: string;
  search_volume: number;
  current_snippet_holder?: string;
  client_position?: number;
  snippet_type: string;                // "list", "paragraph", "table"
  optimization_recommendation: string;
}

interface PaaOpportunity {
  question: string;
  parent_keyword: string;
  search_volume?: number;
  currently_answered_by?: string;
}

interface AiOverviewPresence {
  keyword: string;
  ai_overview_present: boolean;
  client_referenced: boolean;
  competitors_referenced: string[];
  optimization_opportunity: string;
}

interface LlmVisibility {
  engine: string;
  queries_tested: number;
  brand_mentioned_count: number;
  mention_rate: number;                // 0-1
  competitors_mentioned: Record<string, number>;
  key_findings: string[];
}
```

**Layout:**

1. **AEO Readiness Score** — large circular gauge (0-100). This is the headline metric for the section. Color: <40 red, 40-70 amber, 70+ green.

2. **Featured Snippet Opportunities** — card list:
   - Keyword + volume
   - Snippet type badge (list/paragraph/table icon)
   - Current holder (if any — show as "Currently held by: domain.com" with red text, or "Unclaimed" in green)
   - Client position
   - Expandable: optimization recommendation

3. **People Also Ask** — list of questions grouped by parent keyword:
   - Question text
   - Volume if available
   - "Answered by" badge or "Unclaimed"

4. **AI Overview Presence** — table or card grid:
   - Keyword
   - AI Overview present? (checkmark / X)
   - Client referenced? (checkmark / X, with red/green coloring)
   - Competitors referenced (domain badges)
   - Expandable: optimization opportunity

5. **LLM Visibility** — per engine card:
   - Engine name (e.g. "Google AI Overview")
   - Queries tested
   - Brand mention rate as percentage (colored: 0% = red, >0% = amber, >50% = green)
   - Competitors mentioned: bar chart comparing mention counts
   - Key findings as bullet list

6. **AEO Recommendations** — numbered action list with checkboxes (visual only, not interactive).

---

### Section 5: Backlink Profile

```typescript
interface BacklinkProfileSection {
  section_description: string;
  total_backlinks: number;
  referring_domains: number;
  dofollow_ratio: number;              // 0-1
  domain_authority?: number;
  spam_score?: number;
  anchor_distribution: AnchorDistribution[];
  competitor_comparison: CompetitorBacklinkComparison[];
  gap_opportunities: BacklinkGapOpportunity[];
  backlink_health_summary: string;
  link_building_priorities: string[];
}

interface AnchorDistribution {
  category: string;
  percentage: number;
  examples: string[];
}

interface CompetitorBacklinkComparison {
  company_name: string;
  domain: string;
  total_backlinks: number;
  referring_domains: number;
  domain_rank?: number;
  dofollow_ratio: number;              // 0-1 or null
}

interface BacklinkGapOpportunity {
  referring_domain: string;
  domain_rank?: number;
  links_to_competitors: string[];
  acquisition_difficulty: "easy" | "medium" | "hard";
  recommendation: string;
}
```

**Layout:**

1. **Hero metrics row** — four stat cards:
   - Total Backlinks (large number, formatted)
   - Referring Domains
   - Dofollow Ratio (as percentage, e.g. "89%")
   - Spam Score (low is good — color: <5 green, 5-10 amber, >10 red)

2. **Competitor Comparison** — horizontal bar chart or table comparing all domains:
   - Columns: Company, Total Backlinks, Referring Domains, Domain Rank, Dofollow Ratio
   - Highlight client row
   - Sort by referring domains descending
   - Visual bars showing relative scale

3. **Anchor Text Distribution** — donut/pie chart:
   - Segments: branded, generic, exact_match, partial_match, url, other
   - Each segment shows percentage
   - Click/hover shows example anchors

4. **Link Gap Opportunities** — card list:
   - Referring domain (large, as a link)
   - Domain rank (as a badge/score)
   - "Links to:" competitor domain badges
   - Difficulty badge (easy=green, medium=amber, hard=red)
   - Expandable: recommendation text

5. **Link Building Priorities** — numbered action list.

6. **Backlink health summary** — styled text block.

---

### Section 6: Competitive Search Landscape

```typescript
interface CompetitiveSearchSection {
  section_description: string;
  client_profile: SearchProfile;
  competitor_profiles: SearchProfile[];
  competitive_positioning_summary: string;
  differentiation_opportunities: string[];
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
```

**Layout:**

1. **Competitive overview table/chart** — compare all profiles side by side:
   - Rows: Total Keywords, Top 10 Keywords, Estimated Traffic, Domain Authority
   - Columns: Client (highlighted) + each competitor
   - Use bar charts or radar chart to visualize the comparison

2. **Individual profile cards** — one for each company:
   - Client card is visually distinguished (highlighted border or background)
   - Company name + domain
   - Key metrics: keywords, top 10, traffic, DA
   - Top content categories as tags/pills
   - Strengths (green checkmarks) and Weaknesses (red/amber indicators) as bullet lists
   - Expandable for full detail

3. **Competitive positioning summary** — styled text block.

4. **Differentiation Opportunities** — numbered list with bullet points and emphasis on actionable items.

---

### Section 7: Strategic Recommendations

```typescript
interface StrategicRecommendationsSection {
  section_description: string;
  quick_wins: StrategicRecommendation[];
  medium_term: StrategicRecommendation[];
  long_term: StrategicRecommendation[];
  executive_summary: string;
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

**Layout:**

1. **Executive Summary** — prominent styled callout at the top of this section. This is the single most important text block in the entire report. Give it visual weight — large font, card with subtle background, maybe an icon.

2. **Three timeline columns or tabs:**
   - **Quick Wins** (1-4 weeks) — green accent
   - **Medium Term** (1-3 months) — amber accent
   - **Long Term** (3-12 months) — blue accent

3. **Each recommendation as a card:**
   - Title (bold)
   - Category badge (technical=gray, content=blue, backlinks=purple, aeo=emerald, competitive=orange)
   - Effort/Impact matrix: render as a 2x2 grid dot or two side-by-side badges
   - Timeframe
   - KPI label
   - Expandable: full description

4. **Effort/Impact scatter plot** (optional but impressive) — plot all recommendations on a 2D chart with effort on X-axis and impact on Y-axis. Each dot is a recommendation, colored by category. High-impact/low-effort items appear in the top-left "do first" quadrant.

---

## Interaction & UX Notes

- **Tooltips** on all metrics explaining what they mean (e.g. hover over "LCP" → "Largest Contentful Paint — measures loading performance. Good: <2.5s")
- **Print/PDF export** — the report should look good when printed or exported to PDF. Consider a "Print Report" button.
- **Responsive** — works on desktop and tablet. Mobile is secondary but should be readable.
- **Loading states** — skeleton loaders for each section while data loads.
- **Empty states** — if any array is empty, show a helpful message rather than a blank area (e.g. "No schema markup detected" with a suggestion).
- **Numbers formatting** — use commas for thousands (3,850 not 3850), percentages for ratios, abbreviations for large numbers (45K).

---

## Sample Data

Use the following real audit output as test data to build against. This is a complete, real audit for Motion Agency:

```json
{PASTE_SAMPLE_AUDIT_6_JSON_HERE}
```

Replace the placeholder above with the contents of the sample-audit-6.txt file when sharing with Lovable.

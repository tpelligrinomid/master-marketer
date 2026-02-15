import { ContentPlanInput } from "../types/content-plan-input";

// --- System Prompt ---

export const CONTENT_PLAN_SYSTEM_PROMPT = `You are a senior content strategist at a top-tier B2B marketing consultancy building a client's Content Plan — the comprehensive content strategy document that turns a marketing roadmap and SEO audit into an actionable content program.

Your approach synthesizes THREE sources of insight:

1. **Marketing Roadmap (provided)** — ICPs with empathy maps, StoryBrand framework, products & solutions, competitive positioning, goals, and roadmap phases. This defines WHO you're targeting and WHAT the business is trying to achieve.

2. **SEO/AEO Audit (provided)** — Technical SEO health, keyword landscape, content gaps, SERP features, backlink profile, and competitive search positioning. This defines WHERE the search opportunities are and what the competitive landscape looks like.

3. **Meeting Transcripts (provided)** — Discovery sessions, kickoff meetings, and alignment calls with the client. These reveal the client's priorities, constraints, preferences, and business context that the data alone cannot capture.

**When meetings and data conflict, meetings take priority.** The client's stated priorities and business reality override data-driven recommendations.

Output rules:
- Write in professional, narrative markdown suitable for a C-suite audience
- Use headers (##, ###), tables, bullet lists, bold text, and blockquotes as appropriate
- Every recommendation must be specific and client-relevant — no placeholder text like "TBD" or "[insert here]"
- All recommendations must be grounded in the roadmap data, SEO audit data, and meeting context provided
- Content categories must map to SEO keyword clusters from the audit
- KPI targets must reference roadmap goals and SEO baselines
- Channel recommendations must be specific with tactics and cadence, not generic
- Separate distinct output sections with HTML comment markers: <!-- SECTION: section_name -->
- Do NOT wrap output in code blocks — write raw markdown`;

// --- Shared Helpers ---

function buildContextBlock(input: ContentPlanInput): string {
  const parts = [
    `# Client: ${input.client.company_name}`,
    `Domain: ${input.client.domain}`,
    `Competitors: ${input.competitors.map((c) => `${c.company_name} (${c.domain})`).join(", ")}`,
  ];

  if (input.instructions) {
    parts.push(`\n## Strategist Instructions\n${input.instructions}`);
  }

  return parts.join("\n");
}

function formatTranscripts(transcripts: string[], maxChars: number): string {
  if (!transcripts.length) return "";

  const parts = ["# Meeting Transcripts\n"];
  let totalChars = 0;

  for (let i = 0; i < transcripts.length; i++) {
    const remaining = maxChars - totalChars;
    if (remaining <= 0) break;

    parts.push(`## Transcript ${i + 1}\n`);
    const text = transcripts[i].slice(0, remaining);
    parts.push(text);
    parts.push("\n---\n");
    totalChars += text.length;
  }

  return parts.join("\n");
}

/**
 * Summarize prior markdown sections for coherence across calls.
 * Instead of accumulating JSON, we accumulate the markdown text itself (truncated).
 */
function summarizePriorSections(accumulated: string[]): string {
  if (accumulated.length === 0) return "";

  const parts = [
    "# Prior Sections (from earlier calls — maintain coherence)\n",
    "The following markdown sections have already been written. Maintain consistency with terminology, recommendations, and strategic direction established in these sections.\n",
  ];

  for (const section of accumulated) {
    // Truncate large sections to keep context manageable
    const truncated =
      section.length > 3000
        ? section.slice(0, 3000) + "\n\n... (truncated)"
        : section;
    parts.push(truncated);
    parts.push("\n---\n");
  }

  return parts.join("\n");
}

/**
 * Extract relevant roadmap sections for a specific call.
 * Each call only needs certain sections — sending the full roadmap would waste context.
 */
function summarizeRoadmapForContext(
  roadmap: Record<string, unknown>,
  focus: string[]
): string {
  const parts = ["# Roadmap Data\n"];

  for (const key of focus) {
    const value = roadmap[key];
    if (value === undefined) continue;
    const json = JSON.stringify(value, null, 2);
    const truncated = json.length > 5000 ? json.slice(0, 5000) + "\n... (truncated)" : json;
    parts.push(`## ${key}\n\`\`\`json\n${truncated}\n\`\`\`\n`);
  }

  return parts.join("\n");
}

/**
 * Extract relevant SEO audit sections for a specific call.
 */
function summarizeSeoAuditForContext(
  seoAudit: Record<string, unknown>,
  focus: string[]
): string {
  const parts = ["# SEO Audit Data\n"];

  for (const key of focus) {
    const value = seoAudit[key];
    if (value === undefined) continue;
    const json = JSON.stringify(value, null, 2);
    const truncated = json.length > 5000 ? json.slice(0, 5000) + "\n... (truncated)" : json;
    parts.push(`## ${key}\n\`\`\`json\n${truncated}\n\`\`\`\n`);
  }

  return parts.join("\n");
}

/**
 * Format previous content plan sections for quarterly iteration.
 * Now passes previous markdown sections as context instead of JSON.
 */
function formatPreviousContentPlan(
  previousPlan: Record<string, unknown> | undefined,
  guidance: string
): string {
  if (!previousPlan) return "";

  const parts = [
    "# Previous Quarter's Content Plan (for continuity)\n",
    "You are building a QUARTERLY UPDATE to an existing content plan. The previous version's relevant sections are below. Evolve it — don't regenerate from scratch. Maintain continuity where appropriate, and make fresh strategic choices where indicated.\n",
  ];

  // Extract previous markdown sections if available (new format)
  const sections = previousPlan.sections as
    | Array<{ section_title: string; markdown: string }>
    | undefined;
  if (sections && Array.isArray(sections)) {
    for (const section of sections) {
      const md = section.markdown || "";
      const truncated =
        md.length > 3000 ? md.slice(0, 3000) + "\n... (truncated)" : md;
      parts.push(`## Previous: ${section.section_title}\n${truncated}\n`);
    }
  } else {
    // Fallback: pass full_document_markdown if available (still new format)
    const fullMd = previousPlan.full_document_markdown as string | undefined;
    if (fullMd) {
      const truncated =
        fullMd.length > 8000
          ? fullMd.slice(0, 8000) + "\n... (truncated)"
          : fullMd;
      parts.push(`## Previous Content Plan\n${truncated}\n`);
    }
  }

  parts.push(`## Evolution Guidance\n${guidance}\n`);

  return parts.join("\n");
}

// --- Prompt Builders ---

/**
 * Call 1: Foundation + Brand Messaging
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: content_mission -->
 * - <!-- SECTION: content_categories -->
 * - <!-- SECTION: asset_types -->
 * - <!-- SECTION: messaging_guidelines -->
 */
export function buildFoundationAndMessagingPrompt(
  input: ContentPlanInput
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const transcripts = formatTranscripts(input.transcripts, 15000);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["target_market", "brand_story", "products_and_solutions", "goals"]
  );
  const seoContext = summarizeSeoAuditForContext(
    input.seo_audit as Record<string, unknown>,
    ["keyword_landscape", "content_gap"]
  );
  const previousContext = formatPreviousContentPlan(
    input.previous_content_plan as Record<string, unknown> | undefined,
    "Keep content categories stable unless the business has pivoted or new SEO data reveals missed opportunities. Refine the content mission only if ICPs or brand story have changed. Update asset type cadences based on what worked. Evolve messaging dos/donts based on lessons learned — keep the one-liner and elevator pitch consistent unless StoryBrand has been updated."
  );

  const user = `${context}

${transcripts}

${roadmapContext}

${seoContext}

${previousContext}

---

# Task: Write Foundation + Brand Messaging Sections

Write four markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables, bullet lists, and bold text as appropriate.

<!-- SECTION: content_mission -->
## Content Mission

Write a content mission statement as a narrative paragraph. The mission should define the intersection of the client's expertise and their audience's needs — answering: Who is the audience? What will they get? Why does it matter? Follow with 2-3 sentences of rationale explaining why this mission is appropriate given the client's ICPs, brand story, and business goals.

Ground this in the roadmap's target market profiles and StoryBrand framework.

<!-- SECTION: content_categories -->
## Content Categories

Create 4-6 content categories (topic pillars). For each category, write a subsection (### Category Name) containing:
- A 30-50 word description of what this category covers and why it matters to the audience
- **ICP Alignment:** Which ICPs this category serves (from roadmap target_market)
- **Example Topics:** 3-5 example topics within this category
- **SEO Connection:** 1-2 sentences connecting this category to keyword clusters from the SEO audit

Categories should:
1. Map to the client's core service/product areas (from roadmap products_and_solutions)
2. Cross-reference with ICP pain points and goals (from roadmap target_market empathy maps)
3. Connect to keyword clusters from the SEO audit (keyword_landscape.keyword_clusters)
4. Each sustain at least 12 months of unique content ideas

<!-- SECTION: asset_types -->
## Asset Types

Select 5-8 asset types the program will produce. Present as a table:

| Asset Type | Cadence | Primary Owner | Notes |
|---|---|---|---|

Asset types should align with the ICPs' content preferences (from empathy map data) and the flagship program format that will be designed later.

<!-- SECTION: messaging_guidelines -->
## Messaging Guidelines

Create messaging guidelines derived from the StoryBrand framework:

**One-Liner:** A single statement in the format: [Problem] → [Solution] → [Result]. Should be usable at conferences, in email signatures, and on the website.

**Elevator Pitch:** 2-3 sentences expanding the one-liner into a compelling pitch.

**Messaging Dos:**
- List 5-7 messaging principles the team should follow

**Messaging Don'ts:**
- List 5-7 messaging anti-patterns to avoid`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 2: Content Program Design
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: flagship_program -->
 * - <!-- SECTION: episode_structure -->
 */
export function buildContentProgramPrompt(
  input: ContentPlanInput,
  accumulated: string[]
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const transcripts = formatTranscripts(input.transcripts, 10000);
  const priorSections = summarizePriorSections(accumulated);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["target_market", "brand_story", "roadmap_phases"]
  );
  const previousContext = formatPreviousContentPlan(
    input.previous_content_plan as Record<string, unknown> | undefined,
    "Keep the flagship program name, format, and identity — these are brand assets that build equity over time. Evolve the theme statement only if the audience or positioning has shifted. Update the episode structure if feedback or performance data suggests changes. Keep the host the same unless there's a reason to change. Refresh derivative asset strategy based on what channels performed best."
  );

  const user = `${context}

${transcripts}

${priorSections}

${roadmapContext}

${previousContext}

---

# Task: Write Content Program Design Sections

Write two markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables and structured formatting.

<!-- SECTION: flagship_program -->
## Flagship Program

Design the centerpiece content program. Write as narrative prose that covers:
- **Program Name:** A branded name for the series (e.g., "The Talent Table", "Growth Signals"). Should be memorable, relevant, and ownable.
- **Theme Statement:** One sentence describing what the program is about and who it's for
- **Format:** The format (e.g., "Video interview series", "Solo podcast")
- **Episode Cadence:** How often episodes are produced
- **Episode Length:** Target length
- **Host:** Recommended host name and title (from client leadership — use meeting transcripts to identify the best fit, or suggest the CEO/founder if unclear)
- **Target ICPs:** Which ICPs this program primarily serves
- **Content Categories Covered:** Which content categories from the foundation section this program covers
- **Primary Distribution Channels:** Where episodes will be published
- **Derivative Assets Per Episode:** List of derivative assets generated from each episode

Follow the narrative with a summary table capturing the key program parameters.

The program name and format should reflect the client's brand personality (from StoryBrand) and resonate with the target ICPs.

<!-- SECTION: episode_structure -->
## Episode Structure

Design the episode format:

**Segments:** Present as a table with columns: Segment Name | Purpose | Duration

Include 4-6 segments with names that fit the program's brand (e.g., "The Setup", "The Struggles", "The Wins", "The Lessons").

**Intro Script Template:**
Write a template intro script as a blockquote, using placeholders like [Program Name], [Host Name], [Host Title], [Client/Agency Name], [Guest Name], [Guest Title], [Company]. Include a cold open hook placeholder.

**Outro Script Template:**
Write a template outro script as a blockquote, with CTA placeholders (direct CTA and transitional CTA from the StoryBrand framework).`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 3: Amplification + Management + Next Steps
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: content_amplification -->
 * - <!-- SECTION: abm_integration -->
 * - <!-- SECTION: kpi_targets -->
 * - <!-- SECTION: milestones -->
 */
export function buildAmplificationAndManagementPrompt(
  input: ContentPlanInput,
  accumulated: string[]
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorSections = summarizePriorSections(accumulated);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["goals", "roadmap_phases", "quarterly_initiatives", "points_plan"]
  );
  const seoContext = summarizeSeoAuditForContext(
    input.seo_audit as Record<string, unknown>,
    ["competitive_search"]
  );
  const previousContext = formatPreviousContentPlan(
    input.previous_content_plan as Record<string, unknown> | undefined,
    "Generate FRESH 30/60/90-day milestones for the new quarter — do not repeat prior milestones. Update KPI targets based on actual performance vs. prior goals (raise targets that were hit, adjust ones that were missed). Adjust channel priorities based on what worked — double down on high-performing channels, deprioritize underperformers. Evolve ABM tactics based on account engagement data."
  );

  // Include competitive scores for channel strength analysis
  const competitiveScores = input.research.competitive_scores;
  const scoresBlock = Object.keys(competitiveScores).length > 0
    ? `# Competitive Scores\n\`\`\`json\n${JSON.stringify(competitiveScores, null, 2)}\n\`\`\`\n`
    : "";

  const user = `${context}

${priorSections}

${roadmapContext}

${seoContext}

${scoresBlock}

${previousContext}

---

# Task: Write Amplification + Management + Next Steps Sections

Write four markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables, bullet lists, and bold text.

<!-- SECTION: content_amplification -->
## Content Amplification

Write three subsections for channel recommendations:

### Owned Channels
For each of 3-5 owned channels, write a brief paragraph covering: channel name, 3-5 specific tactics (referencing the content categories and flagship program), cadence, priority level, and rationale. Then present a summary table:

| Channel | Priority | Cadence | Key Tactics |
|---|---|---|---|

### Earned Channels
Same format as owned channels for 3-5 earned channel recommendations.

### Paid Channels
Same format for 3-5 paid channel recommendations.

Channel recommendations should:
- Reference the flagship program and content categories from prior sections
- Account for competitive strengths/weaknesses (from competitive scores and SEO audit)
- Align with ICP content preferences
- Include specific, actionable tactics (not just "post content on LinkedIn")

<!-- SECTION: abm_integration -->
## ABM Integration

Create 4-6 ABM integration tactics. Present as a table:

| Activity | Content Integration |
|---|---|

Each content integration description should be specific to this client's content categories and program.

<!-- SECTION: kpi_targets -->
## KPI Targets

Create 8-12 KPI targets spanning content, engagement, and business outcomes. Present as a table:

| Metric | Goal | Data Source | Review Cadence |
|---|---|---|---|

KPI targets should:
- Reference the roadmap's annual goals and benchmarks
- Include both leading indicators (traffic, engagement) and lagging indicators (leads, revenue)
- Be realistic for the client's stage and resources

<!-- SECTION: milestones -->
## 30/60/90-Day Milestones

Write three subsections:

### Days 1-30: Foundation
Present 5-7 milestones as a table:

| Milestone | Target | Category |
|---|---|---|

### Days 31-60: Build
Present 4-6 milestones in the same table format.

### Days 61-90: Launch & Optimize
Present 4-6 milestones in the same table format.

Milestones should align with the roadmap phases and reflect the realistic timeline for standing up the content program.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 4: SEO/AEO Appendix Part 1 — Foundation + Topic Clusters
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: technical_seo -->
 * - <!-- SECTION: site_architecture -->
 * - <!-- SECTION: keyword_strategy -->
 * - <!-- SECTION: topic_clusters -->
 * - <!-- SECTION: faq_paa -->
 */
export function buildSeoFoundationAndClustersPrompt(
  input: ContentPlanInput,
  accumulated: string[]
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorSections = summarizePriorSections(accumulated);
  const seoContext = summarizeSeoAuditForContext(
    input.seo_audit as Record<string, unknown>,
    ["technical_seo", "keyword_landscape", "content_gap", "serp_features_aeo"]
  );
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["target_market"]
  );
  const previousContext = formatPreviousContentPlan(
    input.previous_content_plan as Record<string, unknown> | undefined,
    "Keep the topic cluster structure stable — pillar pages are long-term investments. Update subtopics based on new keyword data and content that has already been published (mark published subtopics and add new ones). Refresh technical SEO recommendations based on the new audit — remove resolved issues, add new ones. Update FAQ/PAA targets with new questions that have surfaced and remove ones that have been answered."
  );

  const user = `${context}

${priorSections}

${seoContext}

${roadmapContext}

${previousContext}

---

# Task: Write SEO/AEO Foundation + Topic Clusters Sections

Write five markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables and structured formatting.

<!-- SECTION: technical_seo -->
## Technical SEO Assessment

Write a 3-5 sentence summary of the client's technical SEO health, drawn from the SEO audit's technical_seo section. Reference the health score, key issues, and the technical verdict.

Then present 5-8 technical SEO recommendations as a table:

| Area | Current Status | Recommendation | Priority |
|---|---|---|---|

<!-- SECTION: site_architecture -->
## Site Architecture

Write a 3-5 sentence narrative recommending the hub-and-spoke (topic cluster) site architecture approach, specifically mapping to the content categories defined in the foundation section. Explain how pillar pages will map to categories and how cluster content will fill keyword gaps identified in the SEO audit.

<!-- SECTION: keyword_strategy -->
## Keyword Strategy

Write a 3-5 sentence summary of the keyword strategy, synthesizing the SEO audit's keyword landscape and content gaps into strategic direction. Reference the most impactful keyword clusters and how they map to the content categories.

<!-- SECTION: topic_clusters -->
## Topic Clusters

Create one topic cluster per content category (from the foundation section). For each cluster, write a subsection (### Cluster: [Category Name]) containing:

**Pillar Page:** [Topic] | Primary Keyword: [keyword] | Search Volume: [volume]

**Subtopics:**

| Subtopic | Target Keyword | Search Volume | Intent | Content Type |
|---|---|---|---|---|

Include 4-6 subtopics per cluster. Topic clusters must:
- Use REAL keywords from the SEO audit data (keyword_landscape and content_gap)
- Include actual search volumes from the data
- Map each cluster to one content category from the foundation
- Prioritize business-relevant keywords over vanity traffic
- Include a mix of informational and commercial intent keywords

<!-- SECTION: faq_paa -->
## FAQ & People Also Ask Targets

Create 10-15 FAQ/PAA targets as a table:

| Question | Source | Target Page | Priority |
|---|---|---|---|

Questions should come from PAA data in the SEO audit, ICP pain points, sales feedback, or content gaps. Target pages should reference topic cluster pillars or spokes.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 5: SEO/AEO Appendix Part 2 — AEO + Authority + Measurement
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: entity_optimization -->
 * - <!-- SECTION: schema_recommendations -->
 * - <!-- SECTION: aeo_content_strategy -->
 * - <!-- SECTION: link_building -->
 * - <!-- SECTION: seo_aeo_kpis -->
 * - <!-- SECTION: local_seo --> (conditional)
 */
export function buildAeoAndAuthorityPrompt(
  input: ContentPlanInput,
  accumulated: string[]
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorSections = summarizePriorSections(accumulated);
  const seoContext = summarizeSeoAuditForContext(
    input.seo_audit as Record<string, unknown>,
    ["serp_features_aeo", "backlink_profile", "competitive_search", "technical_seo"]
  );
  const previousContext = formatPreviousContentPlan(
    input.previous_content_plan as Record<string, unknown> | undefined,
    "Update schema recommendations based on what has been implemented — remove completed items, add new enrichment opportunities. Refresh AEO content recommendations based on new SERP/AEO data and what content has been published. Evolve link building tactics based on what worked (which tactics produced links, which didn't). Update SEO/AEO KPI targets based on actual performance — raise targets that were exceeded, adjust underperforming ones. Refresh entity optimization based on new AI visibility data."
  );

  const user = `${context}

${priorSections}

${seoContext}

${previousContext}

---

# Task: Write AEO + Authority + Measurement Sections

Write five or six markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables and structured formatting.

<!-- SECTION: entity_optimization -->
## Entity Optimization

Write a 4-6 sentence plan for building entity authority for the client's brand, key people, and core topics. Reference the SEO audit's schema inventory and SERP/AEO data to identify what's already established and what needs development. Include specific tactics for building entity recognition in AI answer engines.

<!-- SECTION: schema_recommendations -->
## Schema Markup Recommendations

Create 5-8 schema markup recommendations as a table:

| Schema Type | Where to Apply | Implementation Notes | Priority |
|---|---|---|---|

Reference the existing schema inventory from the SEO audit. For types already implemented, recommend enrichments. For missing types, recommend implementation. Only recommend valid Schema.org types.

<!-- SECTION: aeo_content_strategy -->
## AEO Content Strategy

Create 5-8 AEO content recommendations. For each tactic, write a subsection (### [Tactic Name]) containing:
- 2-3 sentences describing the specific approach
- **Target Queries:** 3-5 specific queries this tactic targets (from the SEO audit's PAA/snippet/AI overview data)
- **Expected Impact:** Expected impact description

Recommendations should be grounded in the actual SERP features and AEO data from the audit.

<!-- SECTION: link_building -->
## Link Building Strategy

Create 5-7 link building tactics as a table:

| Tactic | Description | Expected Links/Quarter | Priority |
|---|---|---|---|

Follow with a brief narrative paragraph for each high-priority tactic explaining the execution approach specific to this client. Reference the backlink profile data from the audit.

<!-- SECTION: seo_aeo_kpis -->
## SEO/AEO KPIs

Create 8-10 SEO/AEO-specific KPI targets as a table:

| Metric | Goal | Data Source | Review Cadence |
|---|---|---|---|

These should complement (not duplicate) the management KPI targets from the earlier section. Focus on search-specific metrics.

<!-- SECTION: local_seo -->
## Local SEO

If the client has a physical location or targets geographic markets, write 3-5 local SEO recommendations as a table:

| Area | Recommendation | Priority |
|---|---|---|

If the client is purely digital/national with no geographic focus, write a brief sentence stating that local SEO is not applicable and omit the table.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

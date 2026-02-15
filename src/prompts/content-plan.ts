import { ContentPlanInput } from "../types/content-plan-input";

// --- System Prompt ---

export const CONTENT_PLAN_SYSTEM_PROMPT = `You are a senior content strategist at a top-tier B2B marketing consultancy building a client's Content Plan — the comprehensive content strategy document that turns a marketing roadmap and SEO audit into an actionable content program.

Your approach synthesizes THREE sources of insight:

1. **Marketing Roadmap (provided)** — ICPs with empathy maps, StoryBrand framework, products & solutions, competitive positioning, goals, and roadmap phases. This defines WHO you're targeting and WHAT the business is trying to achieve.

2. **SEO/AEO Audit (provided)** — Technical SEO health, keyword landscape, content gaps, SERP features, backlink profile, and competitive search positioning. This defines WHERE the search opportunities are and what the competitive landscape looks like.

3. **Meeting Transcripts (provided)** — Discovery sessions, kickoff meetings, and alignment calls with the client. These reveal the client's priorities, constraints, preferences, and business context that the data alone cannot capture.

**When meetings and data conflict, meetings take priority.** The client's stated priorities and business reality override data-driven recommendations.

Output rules:
- Return ONLY valid JSON matching the specified schema
- No markdown code blocks, no explanations, no meta-commentary — just raw JSON
- Every field must contain specific, client-relevant content — no placeholder text like "TBD" or "[insert here]"
- All recommendations must be grounded in the roadmap data, SEO audit data, and meeting context provided
- Write in a professional, strategic tone appropriate for a C-suite audience
- Content categories must map to SEO keyword clusters from the audit
- KPI targets must reference roadmap goals and SEO baselines
- Channel recommendations must be specific with tactics and cadence, not generic`;

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

function summarizePriorResults(accumulated: Record<string, unknown>): string {
  const keys = Object.keys(accumulated);
  if (keys.length === 0) return "";

  const parts = ["# Prior Results (from earlier calls — maintain coherence)\n"];
  for (const key of keys) {
    const value = accumulated[key];
    const json = JSON.stringify(value, null, 2);
    // Truncate large sections to keep context manageable
    const truncated = json.length > 3000 ? json.slice(0, 3000) + "\n... (truncated)" : json;
    parts.push(`## ${key}\n\`\`\`json\n${truncated}\n\`\`\`\n`);
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

// --- Prompt Builders ---

/**
 * Call 1: Foundation + Brand Messaging
 *
 * Generates: Content mission statement, 4-6 content categories (topic pillars),
 * asset type selections, messaging guidelines (one-liner, elevator pitch, dos/donts)
 *
 * Inputs:
 * - Roadmap: target_market (full ICPs + empathy maps), brand_story (full StoryBrand),
 *   products_and_solutions, goals
 * - SEO Audit: keyword_landscape (cluster names + themes), content_gap (gap themes)
 * - Transcripts (15K chars)
 * - Instructions
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

  const user = `${context}

${transcripts}

${roadmapContext}

${seoContext}

---

# Task: Generate Foundation + Brand Messaging

Generate a JSON object with four top-level keys: \`content_mission\`, \`content_categories\`, \`asset_types\`, and \`messaging\`.

## content_mission

Create a content mission statement:
- \`statement\`: One or two sentences defining the intersection of the client's expertise and their audience's needs. It should answer: Who is the audience? What will they get? Why does it matter?
- \`rationale\`: 2-3 sentences explaining why this mission is appropriate given the client's ICPs, brand story, and business goals

Ground this in the roadmap's target market profiles and StoryBrand framework.

## content_categories

Create 4-6 content categories (topic pillars). For each:
- \`name\`: Category name (e.g., "Talent Acquisition Strategy")
- \`description\`: 30-50 words on what this category covers and why it matters to the audience
- \`icp_alignment\`: Array of ICP names this category serves (from roadmap target_market)
- \`example_topics\`: 3-5 example topics within this category
- \`seo_cluster_connection\`: 1-2 sentences connecting this category to keyword clusters from the SEO audit

Categories should:
1. Map to the client's core service/product areas (from roadmap products_and_solutions)
2. Cross-reference with ICP pain points and goals (from roadmap target_market empathy maps)
3. Connect to keyword clusters from the SEO audit (keyword_landscape.keyword_clusters)
4. Each sustain at least 12 months of unique content ideas

## asset_types

Select 5-8 asset types the program will produce. For each:
- \`asset_type\`: The type (e.g., "Video Episode", "Blog Post", "Short-Form Video Clip", "Podcast Episode", "Email Newsletter", "Case Study", "Ebook/Whitepaper", "Social Media Post")
- \`cadence\`: How often (e.g., "2x/month", "Weekly", "Per episode")
- \`primary_owner\`: Who produces this ("Agency", "Client", "Agency + Client")
- \`notes\`: Any specifics about format, length, or requirements

Asset types should align with the ICPs' content preferences (from empathy map data) and the flagship program format that will be designed in Call 2.

## messaging

Create messaging guidelines derived from the StoryBrand framework:
- \`one_liner\`: A single statement in the format: [Problem] → [Solution] → [Result]. Should be usable at conferences, in email signatures, and on the website
- \`elevator_pitch\`: 2-3 sentences expanding the one-liner into a compelling pitch
- \`messaging_dos\`: 5-7 messaging principles the team should follow (e.g., "Lead with the customer's pain, not your features")
- \`messaging_donts\`: 5-7 messaging anti-patterns to avoid (e.g., "Don't use jargon the customer wouldn't use")

Return as:
\`\`\`
{
  "content_mission": {
    "statement": "...",
    "rationale": "..."
  },
  "content_categories": [
    {
      "name": "...",
      "description": "...",
      "icp_alignment": ["..."],
      "example_topics": ["..."],
      "seo_cluster_connection": "..."
    }
  ],
  "asset_types": [
    {
      "asset_type": "...",
      "cadence": "...",
      "primary_owner": "...",
      "notes": "..."
    }
  ],
  "messaging": {
    "one_liner": "...",
    "elevator_pitch": "...",
    "messaging_dos": ["..."],
    "messaging_donts": ["..."]
  }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 2: Content Program Design
 *
 * Generates: Flagship program (name, format, cadence, host, channels),
 * episode structure with segments, intro/outro script templates
 *
 * Inputs:
 * - Accumulated: categories, asset types, mission, messaging
 * - Roadmap: target_market, brand_story, roadmap_phases
 * - Transcripts (10K chars)
 */
export function buildContentProgramPrompt(
  input: ContentPlanInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const transcripts = formatTranscripts(input.transcripts, 10000);
  const priorResults = summarizePriorResults(accumulated);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["target_market", "brand_story", "roadmap_phases"]
  );

  const user = `${context}

${transcripts}

${priorResults}

${roadmapContext}

---

# Task: Generate Content Program Design

Generate a JSON object with two top-level keys: \`flagship_program\` and \`episode_structure\`.

## flagship_program

Design the centerpiece content program:
- \`program_name\`: A branded name for the series (e.g., "The Talent Table", "Growth Signals", "The Builder's Blueprint"). Should be memorable, relevant, and ownable.
- \`theme_statement\`: One sentence describing what the program is about and who it's for
- \`format\`: The format (e.g., "Video interview series", "Solo podcast", "Panel discussion", "Documentary-style video")
- \`episode_cadence\`: How often episodes are produced (e.g., "Bi-weekly", "Monthly")
- \`episode_length\`: Target length (e.g., "25-35 minutes")
- \`host_name\`: Recommended host name (from client leadership — use meeting transcripts to identify the best fit, or suggest the CEO/founder if unclear)
- \`host_title\`: Host's title
- \`target_icps\`: Which ICPs this program primarily serves
- \`content_categories_covered\`: Which content categories from Call 1 this program covers (typically 3-5 of them)
- \`primary_distribution_channels\`: Where episodes will be published (e.g., ["YouTube", "Apple Podcasts", "Spotify", "Website"])
- \`derivative_assets_per_episode\`: List of derivative assets generated from each episode (e.g., ["Full-length video", "Full-length audio", "Blog recap article", "3-5 short-form video clips", "Quote graphics", "Email newsletter feature", "5-8 social media posts", "Full transcript"])

The program name and format should reflect the client's brand personality (from StoryBrand) and resonate with the target ICPs.

## episode_structure

Design the episode format:
- \`segments\`: Array of 4-6 segments, each with:
  - \`name\`: Segment name (e.g., "The Setup", "The Struggles", "The Wins", "The Lessons")
  - \`purpose\`: What this segment accomplishes
  - \`duration\`: Approximate duration (e.g., "3-5 minutes", "8-12 minutes")
- \`intro_script_template\`: A template intro script using placeholders like [Program Name], [Host Name], [Host Title], [Client/Agency Name], [Guest Name], [Guest Title], [Company]. Include a cold open hook placeholder.
- \`outro_script_template\`: A template outro script with CTA placeholders (direct CTA and transitional CTA from the StoryBrand framework).

Return as:
\`\`\`
{
  "flagship_program": {
    "program_name": "...",
    "theme_statement": "...",
    "format": "...",
    "episode_cadence": "...",
    "episode_length": "...",
    "host_name": "...",
    "host_title": "...",
    "target_icps": ["..."],
    "content_categories_covered": ["..."],
    "primary_distribution_channels": ["..."],
    "derivative_assets_per_episode": ["..."]
  },
  "episode_structure": {
    "segments": [
      { "name": "...", "purpose": "...", "duration": "..." }
    ],
    "intro_script_template": "...",
    "outro_script_template": "..."
  }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 3: Amplification + Management + Next Steps
 *
 * Generates: Owned/earned/paid channel recommendations with tactics and cadence,
 * ABM integration, KPI targets, 30/60/90-day milestones
 *
 * Inputs:
 * - Accumulated: categories, flagship program, asset types
 * - Roadmap: goals, roadmap_phases, quarterly_initiatives
 * - SEO Audit: competitive_search (channel strengths)
 * - Research: competitive_scores
 */
export function buildAmplificationAndManagementPrompt(
  input: ContentPlanInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorResults = summarizePriorResults(accumulated);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["goals", "roadmap_phases", "quarterly_initiatives", "points_plan"]
  );
  const seoContext = summarizeSeoAuditForContext(
    input.seo_audit as Record<string, unknown>,
    ["competitive_search"]
  );

  // Include competitive scores for channel strength analysis
  const competitiveScores = input.research.competitive_scores;
  const scoresBlock = Object.keys(competitiveScores).length > 0
    ? `# Competitive Scores\n\`\`\`json\n${JSON.stringify(competitiveScores, null, 2)}\n\`\`\`\n`
    : "";

  const user = `${context}

${priorResults}

${roadmapContext}

${seoContext}

${scoresBlock}

---

# Task: Generate Amplification + Management + Next Steps

Generate a JSON object with five top-level keys: \`owned_channels\`, \`earned_channels\`, \`paid_channels\`, \`abm_integration\`, \`kpi_targets\`, and \`milestones\`.

## owned_channels, earned_channels, paid_channels

For each channel type, create 3-5 recommendations. Each recommendation:
- \`channel\`: Channel name (e.g., "Website / Blog", "LinkedIn (Organic)", "Email Newsletter", "YouTube")
- \`tactics\`: 3-5 specific tactics for this channel (not generic — reference the content categories and flagship program)
- \`cadence\`: How often to activate this channel (e.g., "3-5 posts/week", "Bi-weekly", "Per episode")
- \`priority\`: "high", "medium", or "low"
- \`rationale\`: 1-2 sentences explaining why this channel matters for this client based on their ICPs, competitive landscape, and goals

Channel recommendations should:
- Reference the flagship program and content categories from prior calls
- Account for competitive strengths/weaknesses (from competitive scores and SEO audit)
- Align with ICP content preferences
- Include specific, actionable tactics (not just "post content on LinkedIn")

## abm_integration

Create 4-6 ABM integration tactics:
- \`activity\`: The ABM activity (e.g., "Account Research", "Personalized Outreach")
- \`content_integration\`: How content integrates with this activity (specific to this client's content categories and program)

## kpi_targets

Create 8-12 KPI targets spanning content, engagement, and business outcomes:
- \`metric\`: The specific metric (e.g., "Organic search sessions", "Content-attributed leads", "Podcast downloads per episode")
- \`goal\`: A specific, measurable goal (e.g., "500 monthly organic sessions within 6 months", "10 MQLs per quarter from content")
- \`data_source\`: Where this data is tracked (e.g., "Google Analytics 4", "HubSpot", "YouTube Studio")
- \`review_cadence\`: How often to review (e.g., "Monthly", "Quarterly")

KPI targets should:
- Reference the roadmap's annual goals and benchmarks
- Include both leading indicators (traffic, engagement) and lagging indicators (leads, revenue)
- Be realistic for the client's stage and resources

## milestones

Create 30/60/90-day milestones. Return three arrays:
- \`milestones_30_day\`: 5-7 milestones for Days 1-30 (Foundation phase)
- \`milestones_60_day\`: 4-6 milestones for Days 31-60 (Build phase)
- \`milestones_90_day\`: 4-6 milestones for Days 61-90 (Launch & Optimize phase)

Each milestone:
- \`milestone\`: What needs to be accomplished
- \`target\`: When within the phase (e.g., "Week 2-3", "Week 6")
- \`category\`: "foundation", "build", or "launch"

Milestones should align with the roadmap phases and reflect the realistic timeline for standing up the content program.

Return as:
\`\`\`
{
  "owned_channels": [{ "channel": "...", "tactics": ["..."], "cadence": "...", "priority": "high|medium|low", "rationale": "..." }],
  "earned_channels": [{ "channel": "...", "tactics": ["..."], "cadence": "...", "priority": "high|medium|low", "rationale": "..." }],
  "paid_channels": [{ "channel": "...", "tactics": ["..."], "cadence": "...", "priority": "high|medium|low", "rationale": "..." }],
  "abm_integration": [{ "activity": "...", "content_integration": "..." }],
  "kpi_targets": [{ "metric": "...", "goal": "...", "data_source": "...", "review_cadence": "..." }],
  "milestones": {
    "milestones_30_day": [{ "milestone": "...", "target": "...", "category": "foundation" }],
    "milestones_60_day": [{ "milestone": "...", "target": "...", "category": "build" }],
    "milestones_90_day": [{ "milestone": "...", "target": "...", "category": "launch" }]
  }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 4: SEO/AEO Appendix Part 1 — Foundation + Topic Clusters
 *
 * Generates: Technical SEO summary + recommendations, site architecture (hub-and-spoke),
 * keyword strategy summary, topic clusters mapped to content categories, FAQ/PAA targets
 *
 * Inputs:
 * - Accumulated: content categories, flagship program
 * - SEO Audit: technical_seo (full), keyword_landscape (full), content_gap (full), serp_features_aeo
 * - Roadmap: target_market (ICP pain points for question targeting)
 */
export function buildSeoFoundationAndClustersPrompt(
  input: ContentPlanInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorResults = summarizePriorResults(accumulated);
  const seoContext = summarizeSeoAuditForContext(
    input.seo_audit as Record<string, unknown>,
    ["technical_seo", "keyword_landscape", "content_gap", "serp_features_aeo"]
  );
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["target_market"]
  );

  const user = `${context}

${priorResults}

${seoContext}

${roadmapContext}

---

# Task: Generate SEO/AEO Foundation + Topic Clusters

Generate a JSON object with six top-level keys: \`technical_seo_summary\`, \`technical_seo_recommendations\`, \`site_architecture_summary\`, \`keyword_strategy_summary\`, \`topic_clusters\`, and \`faq_paa_targets\`.

## technical_seo_summary

A 3-5 sentence summary of the client's technical SEO health, drawn from the SEO audit's technical_seo section. Reference the health score, key issues, and the technical verdict (proceed_to_content / technical_audit_first / parallel_workstreams).

## technical_seo_recommendations

Create 5-8 technical SEO recommendations based on the audit findings:
- \`area\`: The area of technical SEO (e.g., "Core Web Vitals", "Schema Markup", "Redirect Chains")
- \`current_status\`: Brief assessment of current state based on audit data
- \`recommendation\`: Specific action to take
- \`priority\`: "high", "medium", or "low"

## site_architecture_summary

A 3-5 sentence summary recommending the hub-and-spoke (topic cluster) site architecture approach, specifically mapping to the content categories defined in Call 1. Explain how pillar pages will map to categories and how cluster content will fill keyword gaps identified in the SEO audit.

## keyword_strategy_summary

A 3-5 sentence summary of the keyword strategy, synthesizing the SEO audit's keyword landscape and content gaps into strategic direction. Reference the most impactful keyword clusters and how they map to the content categories.

## topic_clusters

Create one topic cluster per content category (from Call 1). For each:
- \`content_category\`: The category name (must match a category from Call 1)
- \`pillar_page_topic\`: The broad topic for the pillar page
- \`primary_keyword\`: The primary keyword for the pillar page (from SEO audit keyword data)
- \`search_volume\`: Monthly search volume for the primary keyword
- \`cluster_subtopics\`: 4-6 subtopics (spokes), each with:
  - \`subtopic\`: The subtopic title
  - \`target_keyword\`: The keyword to target
  - \`search_volume\`: Monthly search volume
  - \`intent\`: "informational", "commercial", "transactional", or "navigational"
  - \`content_type\`: The recommended content type (e.g., "Blog post", "Landing page", "FAQ section", "Case study")

Topic clusters must:
- Use REAL keywords from the SEO audit data (keyword_landscape and content_gap)
- Include actual search volumes from the data
- Map each cluster to one content category from Call 1
- Prioritize business-relevant keywords over vanity traffic
- Include a mix of informational and commercial intent keywords

## faq_paa_targets

Create 10-15 FAQ/PAA targets:
- \`question\`: The question to target (from PAA data in the SEO audit, or derived from ICP pain points)
- \`source\`: Where this question came from ("PAA", "ICP pain points", "Sales feedback", "Content gap")
- \`target_page\`: Which page or content piece should answer this (reference the topic cluster pillar or spoke)
- \`priority\`: "high", "medium", or "low"

Return as:
\`\`\`
{
  "technical_seo_summary": "...",
  "technical_seo_recommendations": [
    { "area": "...", "current_status": "...", "recommendation": "...", "priority": "high|medium|low" }
  ],
  "site_architecture_summary": "...",
  "keyword_strategy_summary": "...",
  "topic_clusters": [
    {
      "content_category": "...",
      "pillar_page_topic": "...",
      "primary_keyword": "...",
      "search_volume": 0,
      "cluster_subtopics": [
        { "subtopic": "...", "target_keyword": "...", "search_volume": 0, "intent": "...", "content_type": "..." }
      ]
    }
  ],
  "faq_paa_targets": [
    { "question": "...", "source": "...", "target_page": "...", "priority": "high|medium|low" }
  ]
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 5: SEO/AEO Appendix Part 2 — AEO + Authority + Measurement
 *
 * Generates: Entity optimization plan, schema markup recommendations,
 * AEO content recommendations, link building strategy, SEO/AEO KPI targets,
 * local SEO recommendations (conditional)
 *
 * Inputs:
 * - Accumulated: topic clusters, categories, KPI targets from Call 3
 * - SEO Audit: serp_features_aeo, backlink_profile, competitive_search, technical_seo (schema inventory)
 */
export function buildAeoAndAuthorityPrompt(
  input: ContentPlanInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorResults = summarizePriorResults(accumulated);
  const seoContext = summarizeSeoAuditForContext(
    input.seo_audit as Record<string, unknown>,
    ["serp_features_aeo", "backlink_profile", "competitive_search", "technical_seo"]
  );

  const user = `${context}

${priorResults}

${seoContext}

---

# Task: Generate AEO + Authority + Measurement

Generate a JSON object with six top-level keys: \`entity_optimization_plan\`, \`schema_recommendations\`, \`aeo_content_recommendations\`, \`link_building_tactics\`, \`seo_aeo_kpi_targets\`, and \`local_seo_recommendations\`.

## entity_optimization_plan

A 4-6 sentence plan for building entity authority for the client's brand, key people, and core topics. Reference the SEO audit's schema inventory and SERP/AEO data to identify what's already established and what needs development. Include specific tactics for building entity recognition in AI answer engines.

## schema_recommendations

Create 5-8 schema markup recommendations:
- \`schema_type\`: The Schema.org type (e.g., "Organization", "Person", "Article", "FAQ", "VideoObject", "PodcastEpisode", "HowTo", "BreadcrumbList")
- \`where_to_apply\`: Which pages or content types (e.g., "All blog posts", "Episode pages", "About page")
- \`implementation_notes\`: Specific implementation guidance
- \`priority\`: "high", "medium", or "low"

Reference the existing schema inventory from the SEO audit. For types already implemented, recommend enrichments. For missing types, recommend implementation. Do NOT recommend schema types that don't exist in Schema.org.

## aeo_content_recommendations

Create 5-8 AEO content recommendations:
- \`tactic\`: The tactic name (e.g., "FAQ Schema Expansion", "Definitive Statement Content", "Conversational Query Targeting")
- \`description\`: 2-3 sentences describing the specific approach
- \`target_queries\`: 3-5 specific queries this tactic targets (from the SEO audit's PAA/snippet/AI overview data)
- \`expected_impact\`: Expected impact description (e.g., "Win featured snippets for 3-5 target queries within 3 months")

Recommendations should be grounded in the actual SERP features and AEO data from the audit.

## link_building_tactics

Create 5-7 link building tactics:
- \`tactic\`: Tactic name (e.g., "Thought Leadership PR", "Guest Podcast Appearances", "Original Research", "Resource Page Outreach")
- \`description\`: 2-3 sentences on how to execute, specific to this client
- \`expected_links_per_quarter\`: Estimated number of links this tactic can acquire per quarter
- \`priority\`: "high", "medium", or "low"

Reference the backlink profile data from the audit to identify gaps and opportunities.

## seo_aeo_kpi_targets

Create 8-10 SEO/AEO-specific KPI targets:
- \`metric\`: The metric (e.g., "Keywords ranking in top 10", "Featured snippets won", "AI Overview citations", "Domain Authority", "New referring domains per quarter")
- \`goal\`: Specific, measurable target
- \`data_source\`: Where to track this
- \`review_cadence\`: How often to review

These should complement (not duplicate) the management KPI targets from Call 3. Focus on search-specific metrics.

## local_seo_recommendations

If the client has a physical location or targets geographic markets, create 3-5 local SEO recommendations:
- \`area\`: The area (e.g., "Google Business Profile", "Local Citations", "Location Pages")
- \`recommendation\`: Specific action
- \`priority\`: "high", "medium", or "low"

If the client is purely digital/national with no geographic focus, return an empty array.

Return as:
\`\`\`
{
  "entity_optimization_plan": "...",
  "schema_recommendations": [
    { "schema_type": "...", "where_to_apply": "...", "implementation_notes": "...", "priority": "high|medium|low" }
  ],
  "aeo_content_recommendations": [
    { "tactic": "...", "description": "...", "target_queries": ["..."], "expected_impact": "..." }
  ],
  "link_building_tactics": [
    { "tactic": "...", "description": "...", "expected_links_per_quarter": 0, "priority": "high|medium|low" }
  ],
  "seo_aeo_kpi_targets": [
    { "metric": "...", "goal": "...", "data_source": "...", "review_cadence": "..." }
  ],
  "local_seo_recommendations": [
    { "area": "...", "recommendation": "...", "priority": "high|medium|low" }
  ]
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: CONTENT_PLAN_SYSTEM_PROMPT, user };
}

import { SeoAuditInput } from "../types/seo-audit-input";
import { SeoIntelligencePackage, CompanySeoIntelligence } from "../types/seo-audit-intelligence";

// --- System Prompt ---

export const SEO_AUDIT_SYSTEM_PROMPT = `You are a senior SEO/AEO consultant at a top-tier digital marketing consultancy producing a comprehensive technical SEO and search visibility audit. This is a premium deliverable — the kind of analysis a client pays $10,000+ for — that a VP of Marketing or Head of SEO would use to prioritize their organic growth roadmap.

Your approach combines TWO sources of insight:

1. **Intelligence Data (provided)** — Crawl data, keyword rankings, backlink profiles, SERP analysis, AI engine visibility checks, and PageSpeed metrics gathered from DataForSEO, Moz, and Google APIs. When you cite a specific metric, reference the data source.

2. **Expert SEO Knowledge (your training)** — You are an expert with deep knowledge of technical SEO, content strategy, link building, SERP feature optimization, and AI/answer engine optimization (AEO). Go beyond what the data shows — provide expert interpretation, apply established SEO frameworks, reference industry benchmarks, and deliver strategic insight.

Output rules:
- Return ONLY valid JSON matching the specified schema
- No markdown code blocks, no explanations, no meta-commentary — just raw JSON
- Every field must contain specific, data-driven content — no placeholder text like "TBD" or "[insert here]"
- All recommendations must be grounded in the intelligence data provided
- Write in a professional, strategic tone appropriate for a senior marketing audience
- Use concrete numbers from the data when available`;

// --- Intelligence Formatting Helpers ---

function formatOnPageData(intel: SeoIntelligencePackage): string {
  const parts: string[] = ["# OnPage Crawl Data\n"];

  if (intel.onpage_summary) {
    const s = intel.onpage_summary;
    parts.push(`## Crawl Summary`);
    parts.push(`- Domain: ${s.domain}`);
    parts.push(`- Pages Crawled: ${s.pages_crawled}`);
    parts.push(`- Broken Pages: ${s.broken_pages}`);
    parts.push(`- Duplicate Titles: ${s.duplicate_title_count}`);
    parts.push(`- Duplicate Descriptions: ${s.duplicate_description_count}`);
    parts.push(`- Broken Links: ${s.broken_links_count}`);
    parts.push(`- Redirect Chains: ${s.redirect_chains_count}`);
    parts.push(`- Non-Indexable Pages: ${s.non_indexable_count}`);
    parts.push(`- Pages with Microdata: ${s.pages_with_microdata}`);
  }

  if (intel.onpage_pages?.length) {
    parts.push(`\n## Crawled Pages (top 50 by worst score)`);
    for (const page of intel.onpage_pages.slice(0, 50)) {
      parts.push(
        `- ${page.url} | Score: ${page.onpage_score ?? "N/A"} | Status: ${page.status_code} | Words: ${page.content_word_count ?? "N/A"} | Timing: ${page.page_timing ?? "N/A"}ms`
      );
      if (page.is_broken) parts.push(`  ⚠ BROKEN`);
      if (page.is_redirect) parts.push(`  → REDIRECT`);
    }
  }

  if (intel.duplicate_tags?.length) {
    parts.push(`\n## Duplicate Tags`);
    for (const tag of intel.duplicate_tags.slice(0, 20)) {
      parts.push(`- ${tag.tag_type}: "${tag.duplicate_value.slice(0, 100)}" (${tag.pages.length} pages)`);
    }
  }

  if (intel.redirect_chains?.length) {
    parts.push(`\n## Redirect Chains`);
    for (const chain of intel.redirect_chains.slice(0, 20)) {
      parts.push(`- ${chain.from_url} → ${chain.to_url} (${chain.chain_length} hops${chain.is_loop ? " ⚠ LOOP" : ""})`);
    }
  }

  if (intel.non_indexable?.length) {
    parts.push(`\n## Non-Indexable Pages`);
    for (const page of intel.non_indexable.slice(0, 20)) {
      parts.push(`- ${page.url}: ${page.reason}`);
    }
  }

  if (intel.microdata?.length) {
    parts.push(`\n## Microdata (Structured Data)`);
    for (const item of intel.microdata.slice(0, 30)) {
      parts.push(`- ${item.url}: ${item.types.join(", ")} (${item.items_count} items)`);
    }
  }

  if (intel.lighthouse_results?.length) {
    parts.push(`\n## Lighthouse Results`);
    for (const lh of intel.lighthouse_results) {
      parts.push(`- ${lh.url}`);
      parts.push(`  Performance: ${lh.performance_score ?? "N/A"} | SEO: ${lh.seo_score ?? "N/A"} | Accessibility: ${lh.accessibility_score ?? "N/A"}`);
      parts.push(`  LCP: ${lh.largest_contentful_paint ?? "N/A"}ms | TBT: ${lh.total_blocking_time ?? "N/A"}ms | CLS: ${lh.cumulative_layout_shift ?? "N/A"}`);
    }
  }

  if (intel.pagespeed_results?.length) {
    parts.push(`\n## PageSpeed Field Data`);
    for (const ps of intel.pagespeed_results) {
      parts.push(`- ${ps.url} | Performance: ${ps.performance_score ?? "N/A"}`);
      if (ps.field_data) {
        parts.push(`  Field CWV: LCP=${ps.field_data.lcp_p75 ?? "N/A"}ms | FID=${ps.field_data.fid_p75 ?? "N/A"}ms | CLS=${ps.field_data.cls_p75 ?? "N/A"} | INP=${ps.field_data.inp_p75 ?? "N/A"}ms`);
      }
    }
  }

  return parts.join("\n");
}

function formatKeywordData(intel: SeoIntelligencePackage): string {
  const parts: string[] = ["# Keyword Intelligence\n"];

  const clientKw = intel.client.ranked_keywords;
  if (clientKw?.length) {
    parts.push(`## Client Ranked Keywords (top 200 of ${clientKw.length})`);
    for (const kw of clientKw.slice(0, 200)) {
      parts.push(
        `- "${kw.keyword}" | Pos: ${kw.position} | Vol: ${kw.search_volume} | Diff: ${kw.keyword_difficulty ?? "N/A"} | Intent: ${kw.intent ?? "N/A"} | URL: ${kw.url ?? "N/A"}`
      );
    }
  }

  const gapKw = intel.client.content_gap_keywords;
  if (gapKw?.length) {
    parts.push(`\n## Content Gap Keywords (top 100 of ${gapKw.length})`);
    for (const kw of gapKw.slice(0, 100)) {
      const positions = Object.entries(kw.competitor_positions)
        .map(([d, p]) => `${d}:#${p}`)
        .join(", ");
      parts.push(
        `- "${kw.keyword}" | Vol: ${kw.search_volume} | Diff: ${kw.keyword_difficulty ?? "N/A"} | Intent: ${kw.intent ?? "N/A"} | Competitors: ${positions}`
      );
    }
  }

  // Competitor keyword summaries
  for (const comp of intel.competitors) {
    if (comp.ranked_keywords?.length) {
      parts.push(`\n## ${comp.company_name} (${comp.domain}) — Top 50 Keywords`);
      for (const kw of comp.ranked_keywords.slice(0, 50)) {
        parts.push(
          `- "${kw.keyword}" | Pos: ${kw.position} | Vol: ${kw.search_volume}`
        );
      }
    }
  }

  return parts.join("\n");
}

function formatSerpData(intel: SeoIntelligencePackage): string {
  const parts: string[] = ["# SERP Analysis\n"];

  if (intel.serp_results?.length) {
    parts.push(`## SERP Results (${intel.serp_results.length} keywords)`);
    for (const serp of intel.serp_results.slice(0, 30)) {
      parts.push(`\n### "${serp.keyword}" (Volume: ${serp.search_volume ?? "N/A"})`);
      parts.push(`SERP Features: ${serp.serp_features.join(", ") || "none"}`);

      if (serp.featured_snippet) {
        parts.push(`Featured Snippet: ${serp.featured_snippet.url} — "${serp.featured_snippet.title}"`);
      }

      if (serp.ai_overview?.present) {
        parts.push(`AI Overview: PRESENT${serp.ai_overview.content ? ` — "${serp.ai_overview.content.slice(0, 200)}..."` : ""}`);
        if (serp.ai_overview.references?.length) {
          parts.push(`AI Overview References: ${serp.ai_overview.references.map((r) => r.url).join(", ")}`);
        }
      }

      if (serp.people_also_ask?.length) {
        parts.push(`PAA Questions: ${serp.people_also_ask.map((q) => `"${q.question}"`).join("; ")}`);
      }

      parts.push(`Top 5 organic:`);
      for (const result of serp.organic_results.slice(0, 5)) {
        parts.push(`  ${result.position}. ${result.domain} — ${result.title}`);
      }
    }
  }

  return parts.join("\n");
}

function formatBacklinkData(intel: SeoIntelligencePackage): string {
  const parts: string[] = ["# Backlink Intelligence\n"];

  const clientBl = intel.client.backlink_summary;
  if (clientBl) {
    parts.push(`## Client Backlink Summary (${intel.client.domain})`);
    parts.push(`- Total Backlinks: ${clientBl.total_backlinks}`);
    parts.push(`- Referring Domains: ${clientBl.referring_domains}`);
    parts.push(`- Referring IPs: ${clientBl.referring_ips}`);
    parts.push(`- Dofollow: ${clientBl.dofollow} | Nofollow: ${clientBl.nofollow}`);
    parts.push(`- Domain Rank: ${clientBl.domain_rank ?? "N/A"}`);
    parts.push(`- Spam Score: ${clientBl.backlinks_spam_score ?? "N/A"}`);
  }

  if (intel.client.anchors?.length) {
    parts.push(`\n## Anchor Text Distribution (top 30)`);
    for (const anchor of intel.client.anchors.slice(0, 30)) {
      parts.push(`- "${anchor.anchor_text}" | Backlinks: ${anchor.backlinks_count} | Domains: ${anchor.referring_domains}`);
    }
  }

  if (intel.client.backlinks?.length) {
    parts.push(`\n## Top Backlinks (top 100)`);
    for (const bl of intel.client.backlinks.slice(0, 100)) {
      parts.push(`- ${bl.source_url} → ${bl.target_url} | Anchor: "${bl.anchor_text ?? ""}" | ${bl.dofollow ? "dofollow" : "nofollow"} | Rank: ${bl.domain_rank ?? "N/A"}`);
    }
  }

  // Competitor backlink summaries
  for (const comp of intel.competitors) {
    if (comp.backlink_summary) {
      const bl = comp.backlink_summary;
      parts.push(`\n## ${comp.company_name} (${comp.domain}) Backlinks`);
      parts.push(`- Total: ${bl.total_backlinks} | Referring Domains: ${bl.referring_domains} | Rank: ${bl.domain_rank ?? "N/A"}`);
    }
  }

  if (intel.backlink_gap?.length) {
    parts.push(`\n## Backlink Gap (domains linking to competitors but not client)`);
    for (const gap of intel.backlink_gap.slice(0, 50)) {
      parts.push(`- ${gap.domain}`);
    }
  }

  return parts.join("\n");
}

function formatAeoData(intel: SeoIntelligencePackage): string {
  const parts: string[] = ["# AEO / AI Engine Visibility\n"];

  if (intel.llm_mentions?.length) {
    parts.push(`## Brand Mentions in AI Engines (${intel.llm_mentions.length} queries)`);
    const mentioned = intel.llm_mentions.filter((m) => m.brand_mentioned);
    parts.push(`Brand mentioned in ${mentioned.length}/${intel.llm_mentions.length} queries`);
    for (const mention of intel.llm_mentions) {
      parts.push(`- "${mention.keyword}" [${mention.engine}]: ${mention.brand_mentioned ? "✓ MENTIONED" : "✗ Not mentioned"}`);
      if (mention.mention_context) {
        parts.push(`  Context: "${mention.mention_context.slice(0, 200)}"`);
      }
    }
  }

  if (intel.llm_responses?.length) {
    parts.push(`\n## LLM Responses (${intel.llm_responses.length} queries)`);
    for (const resp of intel.llm_responses) {
      parts.push(`- Query: "${resp.query}" [${resp.engine}]`);
      parts.push(`  Brand mentioned: ${resp.brand_mentioned ? "YES" : "NO"}`);
      if (resp.response_text) {
        parts.push(`  Response excerpt: "${resp.response_text.slice(0, 300)}"`);
      }
      if (resp.references?.length) {
        parts.push(`  References: ${resp.references.map((r) => r.url).join(", ")}`);
      }
    }
  }

  return parts.join("\n");
}

function formatCompetitorSeoData(intel: SeoIntelligencePackage): string {
  const parts: string[] = ["# Competitive Search Landscape\n"];

  // Client overview
  const clientKw = intel.client.ranked_keywords;
  const clientBl = intel.client.backlink_summary;
  parts.push(`## ${intel.client.company_name} (${intel.client.domain})`);
  parts.push(`- Ranked Keywords: ${clientKw?.length ?? 0}`);
  parts.push(`- Top 10 Keywords: ${clientKw?.filter((k) => k.position <= 10).length ?? 0}`);
  parts.push(`- Total Backlinks: ${clientBl?.total_backlinks ?? "N/A"}`);
  parts.push(`- Referring Domains: ${clientBl?.referring_domains ?? "N/A"}`);
  if (intel.client.moz_metrics) {
    parts.push(`- Domain Authority (Moz): ${intel.client.moz_metrics.domain_authority ?? "N/A"}`);
  }

  // Competitor overviews
  for (const comp of intel.competitors) {
    const compKw = comp.ranked_keywords;
    const compBl = comp.backlink_summary;
    parts.push(`\n## ${comp.company_name} (${comp.domain})`);
    parts.push(`- Ranked Keywords: ${compKw?.length ?? 0}`);
    parts.push(`- Top 10 Keywords: ${compKw?.filter((k) => k.position <= 10).length ?? 0}`);
    parts.push(`- Total Backlinks: ${compBl?.total_backlinks ?? "N/A"}`);
    parts.push(`- Referring Domains: ${compBl?.referring_domains ?? "N/A"}`);
  }

  if (intel.client.competitor_domains?.length) {
    parts.push(`\n## SERP Competitor Overlap`);
    for (const comp of intel.client.competitor_domains.slice(0, 15)) {
      parts.push(`- ${comp.domain} | Common Keywords: ${comp.common_keywords} | Avg Position: ${comp.avg_position ?? "N/A"}`);
    }
  }

  return parts.join("\n");
}

// --- Shared Helpers ---

function buildContextBlock(input: SeoAuditInput): string {
  const parts = [
    `# Client: ${input.client.company_name}`,
    `Domain: ${input.client.domain}`,
    `Competitors: ${input.competitors.map((c) => `${c.company_name} (${c.domain})`).join(", ")}`,
  ];

  if (input.seed_topics?.length) {
    parts.push(`Focus Topics: ${input.seed_topics.join(", ")}`);
  }

  if (input.instructions) {
    parts.push(`\n## Strategist Instructions\n${input.instructions}`);
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
    const truncated = json.length > 3000 ? json.slice(0, 3000) + "\n... (truncated)" : json;
    parts.push(`## ${key}\n\`\`\`json\n${truncated}\n\`\`\`\n`);
  }

  return parts.join("\n");
}

// --- Prompt Builders ---

/**
 * Call 1: Technical SEO Assessment
 */
export function buildTechnicalSeoPrompt(
  input: SeoAuditInput,
  intel: SeoIntelligencePackage
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const onpageData = formatOnPageData(intel);

  const user = `${context}

${onpageData}

---

# Task: Generate Technical SEO Assessment

Analyze the OnPage crawl data, Lighthouse results, and PageSpeed data to produce a comprehensive technical SEO assessment.

Return a JSON object matching this structure:
\`\`\`
{
  "technical_seo": {
    "health_score": <0-100 number>,
    "pages_crawled": <number>,
    "critical_issues": [
      {
        "issue": "Short issue name",
        "severity": "critical|high|medium|low",
        "affected_pages": <number>,
        "description": "What the issue is and why it matters",
        "recommendation": "Specific steps to fix"
      }
    ],
    "schema_inventory": [
      {
        "schema_type": "Organization|Product|FAQ|etc.",
        "pages_count": <number>,
        "status": "implemented|missing|incomplete",
        "recommendation": "What to do"
      }
    ],
    "core_web_vitals": [
      {
        "url": "...",
        "lcp": <ms or null>,
        "fid": <ms or null>,
        "cls": <number or null>,
        "inp": <ms or null>,
        "performance_score": <0-100 or null>,
        "rating": "good|needs_improvement|poor"
      }
    ],
    "crawlability_summary": "2-3 sentence assessment of crawl health",
    "indexability_summary": "2-3 sentence assessment of indexation status",
    "mobile_readiness_summary": "2-3 sentence assessment of mobile readiness"
  }
}
\`\`\`

Guidelines:
- health_score should reflect overall technical SEO health (0-100)
- Identify 5-10 critical issues sorted by severity
- Include at least 5 schema types in inventory (implemented or missing)
- Include CWV for each tested URL
- All summaries should reference specific data points

Return ONLY the JSON object. No other text.`;

  return { system: SEO_AUDIT_SYSTEM_PROMPT, user };
}

/**
 * Call 2: Keyword Strategy + Content Gaps (combined)
 */
export function buildKeywordStrategyPrompt(
  input: SeoAuditInput,
  intel: SeoIntelligencePackage,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const keywordData = formatKeywordData(intel);
  const priorResults = summarizePriorResults(accumulated);

  const user = `${context}

${priorResults}

${keywordData}

---

# Task: Generate Keyword Landscape + Content Gap Analysis

Analyze the keyword ranking data and content gap intelligence to produce two sections.

Return a JSON object with two keys:
\`\`\`
{
  "keyword_landscape": {
    "total_ranked_keywords": <number>,
    "top_3_keywords": <number>,
    "top_10_keywords": <number>,
    "top_50_keywords": <number>,
    "estimated_organic_traffic": <number>,
    "keyword_clusters": [
      {
        "cluster_name": "Thematic name",
        "intent": "informational|navigational|commercial|transactional",
        "keywords": [
          { "keyword": "...", "position": <n>, "search_volume": <n>, "difficulty": <n>, "url": "..." }
        ],
        "total_traffic_potential": <number>,
        "opportunity_score": <1-10>
      }
    ],
    "top_performers": [
      {
        "keyword": "...",
        "position": <n>,
        "search_volume": <n>,
        "url": "...",
        "trend": "rising|stable|declining"
      }
    ],
    "ranking_distribution_summary": "2-3 sentences about the ranking profile"
  },
  "content_gap": {
    "total_gap_keywords": <number>,
    "high_value_gaps": [
      {
        "keyword": "...",
        "search_volume": <n>,
        "difficulty": <n>,
        "intent": "...",
        "competitor_positions": { "competitor.com": <n> },
        "estimated_traffic_value": <number>,
        "priority": "high",
        "rationale": "Why this gap matters"
      }
    ],
    "quick_wins": [<same structure, priority: "medium">],
    "strategic_gaps": [<same structure, priority: "low">],
    "gap_analysis_summary": "2-3 sentence overview"
  }
}
\`\`\`

Guidelines:
- Create 5-8 keyword clusters grouped by topic/theme
- Include 5-10 top performers
- high_value_gaps: 5-8 keywords with highest traffic potential
- quick_wins: 5-8 keywords with low difficulty that client can rank for quickly
- strategic_gaps: 5-8 keywords that are strategically important despite higher difficulty
- Count actual keywords from the data for ranking distribution numbers

Return ONLY the JSON object. No other text.`;

  return { system: SEO_AUDIT_SYSTEM_PROMPT, user };
}

/**
 * Call 3: SERP Features & AEO Analysis
 */
export function buildSerpAeoPrompt(
  input: SeoAuditInput,
  intel: SeoIntelligencePackage,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const serpData = formatSerpData(intel);
  const aeoData = formatAeoData(intel);
  const priorResults = summarizePriorResults(accumulated);

  const user = `${context}

${priorResults}

${serpData}

${aeoData}

---

# Task: Generate SERP Features & AEO Analysis

Analyze the SERP feature data and AI engine visibility data.

Return a JSON object:
\`\`\`
{
  "serp_features_aeo": {
    "snippet_opportunities": [
      {
        "keyword": "...",
        "search_volume": <n>,
        "current_snippet_holder": "domain or null",
        "client_position": <n or null>,
        "snippet_type": "featured_snippet|paragraph|list|table",
        "optimization_recommendation": "Specific steps"
      }
    ],
    "paa_opportunities": [
      {
        "question": "...",
        "parent_keyword": "...",
        "search_volume": <n or null>,
        "currently_answered_by": "domain or null"
      }
    ],
    "ai_overview_presence": [
      {
        "keyword": "...",
        "ai_overview_present": <boolean>,
        "client_referenced": <boolean>,
        "competitors_referenced": ["..."],
        "optimization_opportunity": "What to do"
      }
    ],
    "llm_visibility": [
      {
        "engine": "google_ai_overview|chatgpt|perplexity",
        "queries_tested": <n>,
        "brand_mentioned_count": <n>,
        "mention_rate": <0-1>,
        "competitors_mentioned": { "competitor": <count> },
        "key_findings": ["..."]
      }
    ],
    "serp_features_summary": "2-3 sentence overview of SERP feature opportunities",
    "aeo_readiness_score": <0-100>,
    "aeo_recommendations": ["3-5 specific AEO recommendations"]
  }
}
\`\`\`

Guidelines:
- Include 5-10 snippet opportunities where client could win featured snippets
- Include 10-15 PAA questions worth targeting
- Score AEO readiness based on: structured data implementation, content comprehensiveness, brand visibility in AI engines, and citation-worthy content
- Each LLM visibility entry should aggregate data by engine

Return ONLY the JSON object. No other text.`;

  return { system: SEO_AUDIT_SYSTEM_PROMPT, user };
}

/**
 * Call 4: Authority & Backlinks
 */
export function buildAuthorityBacklinksPrompt(
  input: SeoAuditInput,
  intel: SeoIntelligencePackage,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const backlinkData = formatBacklinkData(intel);
  const priorResults = summarizePriorResults(accumulated);

  const user = `${context}

${priorResults}

${backlinkData}

---

# Task: Generate Backlink Profile Analysis

Analyze the backlink data including the client's profile, competitor comparisons, and gap opportunities.

Return a JSON object:
\`\`\`
{
  "backlink_profile": {
    "total_backlinks": <number>,
    "referring_domains": <number>,
    "dofollow_ratio": <0-1>,
    "domain_authority": <number or null>,
    "spam_score": <number or null>,
    "anchor_distribution": [
      {
        "category": "branded|exact_match|partial_match|generic|url|other",
        "percentage": <0-100>,
        "examples": ["..."]
      }
    ],
    "competitor_comparison": [
      {
        "company_name": "...",
        "domain": "...",
        "total_backlinks": <n>,
        "referring_domains": <n>,
        "domain_rank": <n or null>,
        "dofollow_ratio": <0-1>
      }
    ],
    "gap_opportunities": [
      {
        "referring_domain": "...",
        "domain_rank": <n or null>,
        "links_to_competitors": ["..."],
        "acquisition_difficulty": "easy|medium|hard",
        "recommendation": "How to acquire this link"
      }
    ],
    "backlink_health_summary": "2-3 sentence assessment",
    "link_building_priorities": ["5-7 prioritized link building recommendations"]
  }
}
\`\`\`

Guidelines:
- Classify anchor text into 5-6 categories with percentages that sum to ~100
- Include all competitors in comparison
- Identify 5-10 actionable gap opportunities with specific acquisition strategies
- If backlink data is limited (subscription not active), note this and provide analysis based on available Moz data

Return ONLY the JSON object. No other text.`;

  return { system: SEO_AUDIT_SYSTEM_PROMPT, user };
}

/**
 * Call 5: Competitive Search Landscape
 */
export function buildCompetitiveSearchPrompt(
  input: SeoAuditInput,
  intel: SeoIntelligencePackage,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const competitorData = formatCompetitorSeoData(intel);
  const priorResults = summarizePriorResults(accumulated);

  const user = `${context}

${priorResults}

${competitorData}

---

# Task: Generate Competitive Search Landscape

Build comprehensive search profiles for the client and each competitor, comparing their organic search presence.

Return a JSON object:
\`\`\`
{
  "competitive_search": {
    "client_profile": {
      "company_name": "...",
      "domain": "...",
      "total_ranked_keywords": <n>,
      "top_10_keywords": <n>,
      "estimated_traffic": <n>,
      "domain_authority": <n or null>,
      "top_content_categories": ["3-5 topic areas where client has strength"],
      "strengths": ["3-5 organic search strengths"],
      "weaknesses": ["3-5 organic search weaknesses"]
    },
    "competitor_profiles": [
      {
        "company_name": "...",
        "domain": "...",
        "total_ranked_keywords": <n>,
        "top_10_keywords": <n>,
        "estimated_traffic": <n>,
        "domain_authority": <n or null>,
        "top_content_categories": ["..."],
        "strengths": ["..."],
        "weaknesses": ["..."]
      }
    ],
    "competitive_positioning_summary": "3-4 sentence strategic assessment of client's position vs competitors",
    "differentiation_opportunities": ["5-7 specific areas where client can differentiate in search"]
  }
}
\`\`\`

Guidelines:
- Use real numbers from the data for keyword counts and traffic estimates
- Identify genuine strengths and weaknesses based on the data
- Differentiation opportunities should be actionable and specific
- Consider both content topics and technical advantages

Return ONLY the JSON object. No other text.`;

  return { system: SEO_AUDIT_SYSTEM_PROMPT, user };
}

/**
 * Call 6: Strategic Recommendations (synthesizes all prior)
 */
export function buildStrategicRecommendationsPrompt(
  input: SeoAuditInput,
  intel: SeoIntelligencePackage,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorResults = summarizePriorResults(accumulated);

  const user = `${context}

${priorResults}

---

# Task: Generate Strategic Recommendations

Synthesize ALL findings from the prior 5 analyses into a prioritized action plan. This is the executive summary and roadmap that ties everything together.

Return a JSON object:
\`\`\`
{
  "strategic_recommendations": {
    "quick_wins": [
      {
        "title": "Short action title",
        "description": "2-3 sentences explaining the recommendation and expected outcome",
        "effort": "low|medium|high",
        "impact": "low|medium|high",
        "timeframe": "1-2 weeks|2-4 weeks|1-2 months",
        "category": "technical|content|backlinks|aeo|competitive",
        "kpi": "The metric this recommendation targets"
      }
    ],
    "medium_term": [<same structure>],
    "long_term": [<same structure>],
    "executive_summary": "4-6 sentence executive summary of the entire SEO/AEO audit"
  }
}
\`\`\`

Guidelines:
- quick_wins: 5-7 recommendations (low effort, high impact, 1-4 weeks)
- medium_term: 5-7 recommendations (medium effort, 1-3 months)
- long_term: 3-5 recommendations (high effort, 3-12 months)
- Each recommendation must reference specific findings from the prior analyses
- The executive_summary should highlight the 3-4 most impactful findings and frame the overall SEO/AEO opportunity
- Recommendations should span all categories: technical fixes, content creation, link building, AEO optimization, and competitive positioning

Return ONLY the JSON object. No other text.`;

  return { system: SEO_AUDIT_SYSTEM_PROMPT, user };
}

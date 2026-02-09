import { ResearchInput } from "../types/research-input";
import {
  IntelligencePackage,
  CompanyIntelligence,
} from "../types/research-intelligence";
import { ResearchDocumentSection } from "../types/research-output";

// --- System Prompt ---

export const RESEARCH_SYSTEM_PROMPT = `You are a senior marketing strategist and competitive intelligence analyst producing a comprehensive Marketing Research document for a B2B technology company.

You write in a professional, analytical tone with specific data points and actionable insights. You avoid generic advice and instead provide granular, company-specific analysis grounded in the intelligence data provided.

Your writing principles:
- Lead with data and evidence, not assumptions
- Cite specific metrics, rankings, and examples from the intelligence data
- Compare companies using concrete numbers (DA scores, follower counts, keyword rankings)
- Identify patterns and strategic implications, not just describe what you see
- Provide actionable recommendations backed by competitive gaps
- Use tables and structured formats where they improve clarity
- Write in complete, publication-ready prose (not notes or bullets unless a table is more appropriate)

Output Format:
- Write in clean markdown with proper heading hierarchy (## for main sections, ### for subsections)
- Use tables for comparative data
- Use bold for key findings and metrics
- Include a brief section summary at the end of each major section

You output markdown only. No JSON wrapping. No meta-commentary.`;

// --- Intelligence Formatting Helpers ---

function formatCompanyIntelligence(
  intel: CompanyIntelligence,
  maxWebPages: number = 10
): string {
  const parts: string[] = [`## ${intel.company_name} (${intel.domain})`];

  // Social media data
  if (intel.social.linkedin) {
    const li = intel.social.linkedin;
    parts.push(`### LinkedIn Profile`);
    parts.push(`- Followers: ${li.followers ?? "N/A"}`);
    parts.push(`- Employees: ${li.employee_count ?? "N/A"}`);
    parts.push(`- Industry: ${li.industry ?? "N/A"}`);
    if (li.description) parts.push(`- Description: ${li.description.slice(0, 300)}`);
    if (li.specialties?.length) parts.push(`- Specialties: ${li.specialties.join(", ")}`);
    if (li.recent_posts?.length) {
      parts.push(`- Recent Posts (${li.recent_posts.length}):`);
      for (const post of li.recent_posts.slice(0, 5)) {
        parts.push(
          `  - "${post.text?.slice(0, 150) || "N/A"}..." (${post.likes ?? 0} likes, ${post.comments ?? 0} comments)`
        );
      }
    }
  }

  if (intel.social.youtube) {
    const yt = intel.social.youtube;
    parts.push(`### YouTube Channel`);
    parts.push(`- Subscribers: ${yt.subscriber_count ?? "N/A"}`);
    parts.push(`- Total Videos: ${yt.video_count ?? "N/A"}`);
    parts.push(`- Total Views: ${yt.view_count ?? "N/A"}`);
    if (yt.recent_videos?.length) {
      parts.push(`- Recent Videos (${yt.recent_videos.length}):`);
      for (const vid of yt.recent_videos.slice(0, 10)) {
        parts.push(
          `  - "${vid.title}" (${vid.view_count ?? 0} views, ${vid.published_at?.slice(0, 10) ?? "N/A"})`
        );
      }
    }
  }

  // Organic/SEO data
  if (intel.organic.moz_metrics) {
    const moz = intel.organic.moz_metrics;
    parts.push(`### SEO Metrics (Moz)`);
    parts.push(`- Domain Authority: ${moz.domain_authority ?? "N/A"}`);
    parts.push(`- Page Authority: ${moz.page_authority ?? "N/A"}`);
    parts.push(`- Spam Score: ${moz.spam_score ?? "N/A"}`);
    parts.push(`- External Links: ${moz.external_links ?? "N/A"}`);
    parts.push(`- Linking Domains: ${moz.linking_domains ?? "N/A"}`);
  }

  if (intel.organic.moz_keywords?.length) {
    parts.push(`### Keyword Rankings (top ${intel.organic.moz_keywords.length})`);
    for (const kw of intel.organic.moz_keywords.slice(0, 20)) {
      parts.push(
        `- "${kw.keyword}" — position ${kw.ranking_position ?? "N/A"}, volume ${kw.search_volume ?? "N/A"}`
      );
    }
  }

  if (intel.organic.moz_top_pages?.length) {
    parts.push(`### Top Pages by Authority (${intel.organic.moz_top_pages.length})`);
    for (const page of intel.organic.moz_top_pages.slice(0, 15)) {
      parts.push(
        `- ${page.url} (PA: ${page.page_authority ?? "N/A"}, links: ${page.external_links ?? "N/A"})`
      );
    }
  }

  if (intel.organic.website_pages?.length) {
    parts.push(`### Website Content (${intel.organic.website_pages.length} pages scraped)`);
    for (const page of intel.organic.website_pages.slice(0, maxWebPages)) {
      parts.push(`#### ${page.title || page.url}`);
      parts.push(page.markdown.slice(0, 2000));
      parts.push("---");
    }
  }

  // Paid media data
  if (intel.paid.spyfu_ppc_keywords?.length) {
    parts.push(`### PPC Keywords (SpyFu, top ${intel.paid.spyfu_ppc_keywords.length})`);
    for (const kw of intel.paid.spyfu_ppc_keywords.slice(0, 15)) {
      parts.push(
        `- "${kw.keyword}" — position ${kw.position ?? "N/A"}, CPC $${kw.cost_per_click ?? "N/A"}, monthly cost $${kw.monthly_cost ?? "N/A"}`
      );
    }
  }

  if (intel.paid.spyfu_ad_history?.length) {
    parts.push(`### Ad Copy History (SpyFu, ${intel.paid.spyfu_ad_history.length} ads)`);
    for (const ad of intel.paid.spyfu_ad_history.slice(0, 10)) {
      parts.push(
        `- Keyword: "${ad.keyword || "N/A"}" | Headline: "${ad.headline || "N/A"}" | "${ad.description?.slice(0, 100) || "N/A"}"`
      );
    }
  }

  if (intel.paid.linkedin_ads?.length) {
    parts.push(`### LinkedIn Ads (${intel.paid.linkedin_ads.length} found)`);
    for (const ad of intel.paid.linkedin_ads.slice(0, 10)) {
      parts.push(
        `- Headline: "${ad.headline || "N/A"}" | Body: "${ad.body?.slice(0, 100) || "N/A"}" | CTA: ${ad.cta || "N/A"}`
      );
    }
  }

  if (intel.paid.google_ads?.length) {
    parts.push(`### Google Ads (${intel.paid.google_ads.length} found)`);
    for (const ad of intel.paid.google_ads.slice(0, 10)) {
      parts.push(
        `- Headline: "${ad.headline || "N/A"}" | Description: "${ad.description?.slice(0, 100) || "N/A"}" | Format: ${ad.format || "N/A"}`
      );
    }
  }

  if (intel.paid.ad_creative_analysis) {
    const analysis = intel.paid.ad_creative_analysis;
    parts.push(`### Ad Creative Analysis (AI-generated)`);
    parts.push(`Summary: ${analysis.summary}`);
    if (analysis.themes.length) parts.push(`Themes: ${analysis.themes.join(", ")}`);
    if (analysis.messaging_patterns.length)
      parts.push(`Messaging Patterns: ${analysis.messaging_patterns.join(", ")}`);
    if (analysis.cta_patterns.length)
      parts.push(`CTA Patterns: ${analysis.cta_patterns.join(", ")}`);
  }

  if (intel.errors.length) {
    parts.push(`### Data Collection Errors`);
    for (const err of intel.errors) {
      parts.push(`- ${err}`);
    }
  }

  return parts.join("\n");
}

function summarizePriorSections(sections: ResearchDocumentSection[]): string {
  if (sections.length === 0) return "";

  const summaries = sections.map(
    (s) =>
      `### ${s.section_title}\n${s.markdown.slice(0, 800)}...`
  );

  return `## Prior Sections (summarized for coherence)\n\n${summaries.join("\n\n")}`;
}

// --- Prompt Builders ---

type SectionType =
  | "market_overview"
  | "industry_dynamics"
  | "technology_innovation"
  | "customer_insights";

const SECTION_CONFIGS: Record<
  SectionType,
  { title: string; wordTarget: number; instructions: string }
> = {
  market_overview: {
    title: "Market Overview",
    wordTarget: 2500,
    instructions: `Write a comprehensive Market Overview section covering:

1. **Market Definition & Scope** — Define the market the client operates in. What is the addressable market? What are its boundaries?
2. **Market Size & Growth** — Use available data to estimate or contextualize market size. Reference industry trends from the intelligence data.
3. **Key Market Segments** — Identify the primary segments (by vertical, company size, use case, geography).
4. **Market Drivers & Tailwinds** — What macro trends are driving growth? Regulatory changes? Technology shifts?
5. **Market Barriers & Headwinds** — What slows adoption? What challenges exist?
6. **Competitive Density** — How crowded is this market? Are there established leaders or is it fragmented?

Ground your analysis in the website content, LinkedIn descriptions, and keyword data provided. Where exact market size data isn't available, use the intelligence to infer market dynamics (e.g., keyword search volumes indicate demand, number of competitors indicates maturity).`,
  },
  industry_dynamics: {
    title: "Industry Dynamics & Trends",
    wordTarget: 2500,
    instructions: `Write a comprehensive Industry Dynamics & Trends section covering:

1. **Industry Evolution** — How has this industry evolved recently? What stage is it in?
2. **Emerging Trends** — What trends are shaping the industry? Reference content themes from competitors' websites and social media.
3. **Buyer Behavior Shifts** — How are buyers in this space changing their evaluation and purchasing behavior?
4. **Channel Dynamics** — Which marketing channels dominate? (Reference LinkedIn activity, content strategies, paid media patterns)
5. **Content & Thought Leadership Landscape** — Who is producing content? What topics dominate? (Reference blog content, YouTube activity, LinkedIn posts)
6. **Regulatory & Compliance Factors** — Any regulatory trends affecting the market?

Use competitor website content, social media activity, and keyword data to identify real patterns rather than generic observations.`,
  },
  technology_innovation: {
    title: "Technology & Innovation Landscape",
    wordTarget: 2500,
    instructions: `Write a comprehensive Technology & Innovation Landscape section covering:

1. **Core Technology Categories** — What technologies define this space? Map the technology stack.
2. **Innovation Trends** — What new capabilities are emerging? Reference product pages and feature sets from scraped websites.
3. **Integration Ecosystem** — What integrations and partnerships matter? Reference partner pages and product documentation.
4. **Technology Differentiation** — How do competitors differentiate on technology? Compare feature sets and positioning.
5. **R&D Signals** — What do job postings, blog content, and product updates suggest about R&D direction?
6. **Technology Adoption Barriers** — What prevents adoption of new technology in this space?

Ground analysis in actual product/feature pages scraped from company websites. Compare specific capabilities across competitors.`,
  },
  customer_insights: {
    title: "Customer & Audience Insights",
    wordTarget: 2500,
    instructions: `Write a comprehensive Customer & Audience Insights section covering:

1. **Target Audience Profiles** — Who are the primary buyers? Map personas from website content, case studies, and ad targeting.
2. **Customer Pain Points** — What problems do customers face? Reference case studies, testimonials, and ad messaging.
3. **Buying Journey** — How do customers evaluate and purchase? What content serves each stage?
4. **Decision Criteria** — What matters most to buyers? (Price, features, support, brand, compliance?)
5. **Customer Evidence** — What proof points exist? Reference case studies, testimonials, customer logos.
6. **Audience Engagement Patterns** — How do audiences engage? (LinkedIn engagement rates, YouTube view patterns, content consumption)

Use case study content, testimonial pages, ad messaging, and social media engagement data to build an evidence-based picture.`,
  },
};

/**
 * Build prompt for main report sections (Market Overview, Industry Dynamics,
 * Technology & Innovation, Customer Insights).
 */
export function buildMainSectionPrompt(
  sectionType: SectionType,
  input: ResearchInput,
  intelligence: IntelligencePackage,
  priorSections: ResearchDocumentSection[]
): { system: string; user: string } {
  const config = SECTION_CONFIGS[sectionType];

  const clientData = formatCompanyIntelligence(intelligence.client, 10);
  const competitorData = intelligence.competitors
    .map((c) => formatCompanyIntelligence(c, 5))
    .join("\n\n");

  const priorContext = summarizePriorSections(priorSections);

  const contextBlock = [
    `# Client: ${input.client.company_name}`,
    `Industry: ${input.context.industry_description}`,
    input.context.solution_category
      ? `Solution Category: ${input.context.solution_category}`
      : null,
    input.context.target_verticals?.length
      ? `Target Verticals: ${input.context.target_verticals.join(", ")}`
      : null,
    input.rag_context
      ? `\n## Discovery Notes / Meeting Context\n${input.rag_context.slice(0, 2000)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const user = `${contextBlock}

${priorContext}

# Intelligence Data

## Client Company
${clientData}

## Competitor Companies
${competitorData}

---

# Section to Write: ${config.title}

${config.instructions}

**Target word count: ~${config.wordTarget} words.**

Write the complete section now. Use markdown formatting with ## and ### headings. Ground every claim in the intelligence data provided.`;

  return { system: RESEARCH_SYSTEM_PROMPT, user };
}

/**
 * Build prompt for the Competitive Landscape section.
 * This is a broader comparative section across all competitors.
 */
export function buildCompetitiveLandscapePrompt(
  input: ResearchInput,
  intelligence: IntelligencePackage,
  priorSections: ResearchDocumentSection[]
): { system: string; user: string } {
  const clientData = formatCompanyIntelligence(intelligence.client, 5);
  const competitorData = intelligence.competitors
    .map((c) => formatCompanyIntelligence(c, 5))
    .join("\n\n");

  const priorContext = summarizePriorSections(priorSections);

  const companyNames = [
    input.client.company_name,
    ...input.competitors.map((c) => c.company_name),
  ];

  const user = `# Client: ${input.client.company_name}
Industry: ${input.context.industry_description}
Companies analyzed: ${companyNames.join(", ")}

${priorContext}

# Intelligence Data

## Client Company
${clientData}

## Competitor Companies
${competitorData}

---

# Section to Write: Competitive Landscape

Write a comprehensive Competitive Landscape section (~4,000 words) covering:

1. **Competitive Overview** — Map the competitive landscape. Who are the key players? How do they position themselves?

2. **Positioning Comparison** — Create a comparison table of how each company positions itself (tagline, value proposition, primary audience, key differentiators). Use data from their websites and LinkedIn profiles.

3. **SEO & Organic Comparison** — Compare Domain Authority, keyword rankings, top pages, and content strategy across all companies. Include a comparison table with DA scores, estimated organic traffic, and content volume.

4. **Social Media Comparison** — Compare LinkedIn followers, posting frequency, engagement patterns, and YouTube presence. Include a comparison table.

5. **Paid Media Comparison** — Compare PPC keyword strategies, ad spend signals (SpyFu data), ad messaging themes, and creative approaches. Include a comparison table of estimated monthly PPC spend and top keywords.

6. **Content Strategy Comparison** — Compare content types (blogs, case studies, whitepapers, videos), publishing frequency, and topic focus areas.

7. **Strengths & Vulnerabilities Matrix** — For each competitor, identify key strengths and strategic vulnerabilities that the client could exploit.

8. **Competitive Gaps & Opportunities** — Identify specific opportunities where the client can differentiate or gain competitive advantage.

**Target word count: ~4,000 words.**
Use comparison tables where they improve clarity. Ground every claim in the intelligence data.`;

  return { system: RESEARCH_SYSTEM_PROMPT, user };
}

/**
 * Build prompt for an individual competitor deep-dive.
 * One call per competitor for better quality and error isolation.
 */
export function buildCompetitorDeepDivePrompt(
  competitorIntel: CompanyIntelligence,
  input: ResearchInput,
  intelligence: IntelligencePackage,
  priorSections: ResearchDocumentSection[]
): { system: string; user: string } {
  const competitorData = formatCompanyIntelligence(competitorIntel, 10);
  const clientData = formatCompanyIntelligence(intelligence.client, 3);
  const priorContext = summarizePriorSections(priorSections);

  const user = `# Client: ${input.client.company_name}
# Competitor Deep-Dive: ${competitorIntel.company_name}

${priorContext}

# Client Intelligence (for comparison)
${clientData}

# Competitor Intelligence
${competitorData}

---

# Section to Write: ${competitorIntel.company_name} — Competitive Deep-Dive

Write a detailed competitive deep-dive for ${competitorIntel.company_name} (~2,000 words) covering:

1. **Company Overview** — Who they are, what they do, their market position. Use their website content and LinkedIn profile.

2. **Product & Solution Analysis** — What do they offer? How do they structure their product/solution portfolio? Reference specific product pages.

3. **Marketing Strategy Assessment**
   - Website & Content: Quality, structure, messaging, conversion approach
   - SEO Performance: Domain authority, keyword strategy, content gaps
   - Social Media: LinkedIn activity, YouTube strategy, engagement quality
   - Paid Media: Ad strategy, messaging themes, spend signals, creative approach

4. **Strengths** — What do they do well? Where are they ahead of ${input.client.company_name}?

5. **Vulnerabilities** — Where are they weak? What opportunities exist for ${input.client.company_name}?

6. **Strategic Implications for ${input.client.company_name}** — Specific, actionable recommendations for how to compete against this company.

**Target word count: ~2,000 words.**
Ground every observation in the intelligence data.`;

  return { system: RESEARCH_SYSTEM_PROMPT, user };
}

/**
 * Build prompt for competitive scoring.
 * Returns structured JSON with scores for each company.
 */
export function buildScoringPrompt(
  input: ResearchInput,
  intelligence: IntelligencePackage,
  priorSections: ResearchDocumentSection[]
): { system: string; user: string } {
  const allCompanies = [intelligence.client, ...intelligence.competitors];
  const summaries = allCompanies
    .map((c) => formatCompanyIntelligence(c, 2))
    .join("\n\n");

  const priorContext = summarizePriorSections(priorSections);

  const companyNames = allCompanies.map((c) => c.company_name);

  const system = `You are a senior marketing strategist scoring companies on their marketing maturity. You provide fair, data-driven scores backed by specific evidence. You output valid JSON only. No markdown, no explanations outside the JSON.`;

  const user = `# Companies to Score
${companyNames.join(", ")}

${priorContext}

# Intelligence Data
${summaries}

---

# Task: Competitive Scoring

Score each company on a scale of 1-10 across 5 dimensions. Provide a brief justification for each dimension.

Scoring criteria:
- **organic_seo** (1-10): Domain authority, keyword rankings, content volume, organic visibility
- **social_media** (1-10): Follower count, posting frequency, engagement quality, channel diversity
- **content_strategy** (1-10): Content types, quality, consistency, thought leadership, SEO alignment
- **paid_media** (1-10): Ad presence, spend signals, creative quality, keyword coverage, multi-channel approach
- **brand_positioning** (1-10): Clarity of positioning, differentiation, messaging consistency, visual identity

The **overall** score should be a weighted average emphasizing organic_seo (25%), content_strategy (25%), social_media (20%), paid_media (15%), brand_positioning (15%).

Return JSON in this exact format:
{
  ${companyNames.map((name) => `"${name}": {
    "organic_seo": <number>,
    "social_media": <number>,
    "content_strategy": <number>,
    "paid_media": <number>,
    "brand_positioning": <number>,
    "overall": <number>,
    "justification": {
      "organic_seo": "<1-2 sentences>",
      "social_media": "<1-2 sentences>",
      "content_strategy": "<1-2 sentences>",
      "paid_media": "<1-2 sentences>",
      "brand_positioning": "<1-2 sentences>"
    }
  }`).join(",\n  ")}
}

Return ONLY the JSON object. No other text.`;

  return { system, user };
}

// Re-export section types for the task
export const MAIN_SECTION_TYPES: SectionType[] = [
  "market_overview",
  "industry_dynamics",
  "technology_innovation",
  "customer_insights",
];

export const MAIN_SECTION_TITLES: Record<SectionType, string> = {
  market_overview: "Market Overview",
  industry_dynamics: "Industry Dynamics & Trends",
  technology_innovation: "Technology & Innovation Landscape",
  customer_insights: "Customer & Audience Insights",
};

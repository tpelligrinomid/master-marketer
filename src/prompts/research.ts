import { ResearchInput } from "../types/research-input";
import {
  IntelligencePackage,
  CompanyIntelligence,
} from "../types/research-intelligence";
import { ResearchDocumentSection } from "../types/research-output";

// --- System Prompt ---

export const RESEARCH_SYSTEM_PROMPT = `You are a senior partner at a top-tier marketing strategy consultancy producing a premium competitive intelligence report — the kind of deliverable a client pays $15,000+ for. This is not a summary or overview. This is an exhaustive, deeply-researched strategy document that a CMO would use to make million-dollar marketing investment decisions.

Your approach combines TWO sources of insight:

1. **Intelligence Data (provided)** — Scraped websites, LinkedIn profiles, YouTube channels, SEO metrics, paid media data, and web research articles. When you cite a specific metric, statistic, or factual claim from this data, include an inline markdown link to the source: \`[source name](url)\`. For example: \`According to [Union Biometrica's product page](https://unionbiometrica.com/products), the COPAS system...\`

2. **Expert Industry Knowledge (your training)** — You are an expert strategist with deep knowledge across B2B marketing, SaaS, technology markets, competitive strategy, and industry dynamics. You MUST bring this expertise to bear. Go beyond what the data shows — provide expert interpretation, draw on your knowledge of industry benchmarks, apply established strategic frameworks, reference well-known market dynamics, and deliver the kind of strategic insight that makes this report worth $15K.

Citation rules:
- Data-backed claims → inline markdown link: \`[source](url)\`
- Scraped website content → link to the page URL
- LinkedIn data → link to the company LinkedIn page (https://linkedin.com/company/{handle})
- YouTube data → link to the channel URL (https://youtube.com/channel/{id})
- Moz metrics → link to the domain (https://{domain})
- Web research articles → link to the article URL
- Expert analysis/industry knowledge → no citation needed, but frame as strategic analysis

Writing standards:
- Every sub-section should be a mini-essay: minimum 3 substantive paragraphs, each 4-6 sentences
- Lead with insight, not description — tell the reader what the data MEANS, not just what it shows
- Use strategic frameworks where appropriate: SWOT, Porter's Five Forces, TAM/SAM/SOM, positioning maps, BCG matrix, customer journey mapping
- Tables are REQUIRED (not optional) where comparative data exists — build them with specific data columns
- Bold key findings and critical metrics
- Provide specific, actionable implications — not generic advice
- Write in complete, publication-ready prose. Bullet points only inside tables or for brief enumeration within larger prose sections
- Use proper markdown heading hierarchy (## for main sections, ### for subsections, #### for sub-subsections)

Output markdown only. No JSON wrapping. No meta-commentary about the task.`;

// --- Intelligence Formatting Helpers ---

function formatCompanyIntelligence(
  intel: CompanyIntelligence,
  maxWebPages: number = 10
): string {
  const parts: string[] = [`## ${intel.company_name} (${intel.domain})`];
  parts.push(`Source URL: https://${intel.domain}`);

  // Social media data
  if (intel.social.linkedin) {
    const li = intel.social.linkedin;
    const linkedInUrl = `https://linkedin.com/company/${intel.domain.replace(/\.(com|io|org|net|co).*$/, "")}`;
    parts.push(`### LinkedIn Profile`);
    parts.push(`LinkedIn URL: ${linkedInUrl}`);
    parts.push(`- Followers: ${li.followers ?? "N/A"}`);
    parts.push(`- Employees: ${li.employee_count ?? "N/A"}`);
    parts.push(`- Industry: ${li.industry ?? "N/A"}`);
    if (li.description) parts.push(`- Description: ${li.description.slice(0, 500)}`);
    if (li.specialties) {
      const specs = Array.isArray(li.specialties) ? li.specialties : [li.specialties];
      parts.push(`- Specialties: ${specs.join(", ")}`);
    }
    if (li.recent_posts?.length) {
      parts.push(`- Recent Posts (${li.recent_posts.length}):`);
      for (const post of li.recent_posts.slice(0, 5)) {
        parts.push(
          `  - "${post.text?.slice(0, 200) || "N/A"}..." (${post.likes ?? 0} likes, ${post.comments ?? 0} comments)`
        );
      }
    }
  }

  if (intel.social.youtube) {
    const yt = intel.social.youtube;
    const ytUrl = `https://youtube.com/channel/${yt.channel_id}`;
    parts.push(`### YouTube Channel`);
    parts.push(`YouTube URL: ${ytUrl}`);
    parts.push(`- Subscribers: ${yt.subscriber_count ?? "N/A"}`);
    parts.push(`- Total Videos: ${yt.video_count ?? "N/A"}`);
    parts.push(`- Total Views: ${yt.view_count ?? "N/A"}`);
    if (yt.recent_videos?.length) {
      parts.push(`- Recent Videos (${yt.recent_videos.length}):`);
      for (const vid of yt.recent_videos.slice(0, 10)) {
        const vidUrl = `https://youtube.com/watch?v=${vid.video_id}`;
        parts.push(
          `  - "${vid.title}" (${vid.view_count ?? 0} views, ${vid.published_at?.slice(0, 10) ?? "N/A"}) — ${vidUrl}`
        );
      }
    }
  }

  // Organic/SEO data
  if (intel.organic.moz_metrics) {
    const moz = intel.organic.moz_metrics;
    parts.push(`### SEO Metrics (Moz)`);
    parts.push(`Moz URL: https://${intel.domain}`);
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
      parts.push(`Page URL: ${page.url}`);
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

function formatKnowledgeBase(input: ResearchInput): string {
  const parts: string[] = [];

  // New structured knowledge_base from MiD App
  if (input.knowledge_base) {
    const kb = input.knowledge_base;

    if (kb.primary_meetings?.length) {
      parts.push("## Primary Discovery Meetings");
      parts.push("These are the key client meetings and discovery sessions.\n");
      for (const meeting of kb.primary_meetings) {
        parts.push(typeof meeting === "string" ? meeting : JSON.stringify(meeting, null, 2));
        parts.push("\n---\n");
      }
    }

    if (kb.other_meetings?.length) {
      parts.push("## Additional Meetings");
      for (const meeting of kb.other_meetings) {
        parts.push(typeof meeting === "string" ? meeting : JSON.stringify(meeting, null, 2));
        parts.push("\n---\n");
      }
    }

    if (kb.notes?.length) {
      parts.push("## Strategist Notes");
      for (const note of kb.notes) {
        parts.push(typeof note === "string" ? note : JSON.stringify(note, null, 2));
        parts.push("\n---\n");
      }
    }

    if (kb.processes?.length) {
      parts.push("## Processes & Workflows");
      for (const process of kb.processes) {
        parts.push(typeof process === "string" ? process : JSON.stringify(process, null, 2));
        parts.push("\n---\n");
      }
    }
  }

  // Legacy rag_context (still supported for backwards compatibility)
  if (input.rag_context) {
    parts.push("## Discovery Notes / Meeting Context");
    parts.push(input.rag_context.slice(0, 4000));
  }

  if (parts.length === 0) return "";
  return "# Knowledge Base & Discovery Context\n\n" + parts.join("\n");
}

function formatWebResearch(webResearch: IntelligencePackage["web_research"]): string {
  if (!webResearch?.length) return "";

  const parts: string[] = ["## Web Research Context"];
  parts.push("The following articles and reports were found via web search to provide additional market and industry context.\n");

  for (const result of webResearch) {
    parts.push(`### ${result.title}`);
    parts.push(`Source URL: ${result.url}`);
    parts.push(`Query: "${result.query}"`);
    parts.push("");
    parts.push(result.content);
    parts.push("\n---\n");
  }

  return parts.join("\n");
}

function summarizePriorSections(sections: ResearchDocumentSection[]): string {
  if (sections.length === 0) return "";

  const summaries = sections.map(
    (s) =>
      `### ${s.section_title}\n${s.markdown.slice(0, 1500)}...`
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
    wordTarget: 5000,
    instructions: `Write an exhaustive Market Overview section. This section should read like a chapter from a premium industry report. Every sub-section below should be a substantive mini-essay — minimum 3 paragraphs of 4-6 sentences each.

### Required Sub-Sections (with minimum word counts):

#### 1. Market Definition & Scope (~800 words minimum)
Define the market the client operates in with precision. What is the addressable market? What are its boundaries? Distinguish between the broad market category and the specific niche. Identify adjacent markets that overlap or compete for the same budget. Use intelligence data (website positioning, keyword themes, competitor focus areas) as evidence, and supplement with your expert knowledge of how this market is typically defined by analysts.

#### 2. TAM / SAM / SOM Analysis (~600 words minimum)
**REQUIRED FRAMEWORK**: Provide a Total Addressable Market → Serviceable Addressable Market → Serviceable Obtainable Market analysis. Use keyword search volumes, competitor count, and industry knowledge to triangulate estimates. Present as a structured breakdown. If exact figures aren't in the data, use your expert knowledge of the industry to provide reasonable estimates with stated assumptions.

#### 3. Market Size & Growth Trajectory (~600 words minimum)
Contextualize market size using available signals: number of active competitors, investment activity, keyword search volumes as demand proxies, and your knowledge of the industry. Discuss growth rate trajectory — is this market accelerating, plateauing, or consolidating?

#### 4. Key Market Segments (~600 words minimum)
Identify primary segments by vertical, company size, use case, and geography. Use competitor targeting signals (LinkedIn industry tags, website case studies, ad targeting) as evidence. Build a segment table:

| Segment | Description | Key Players | Estimated Size | Growth |
|---------|-------------|-------------|----------------|--------|

#### 5. Geographic Market Breakdown (~400 words minimum)
Analyze geographic distribution of the market. Where are the key players headquartered? What regions show strongest demand? Reference headquarters data, language of content, and regional ad targeting.

#### 6. Market Maturity Assessment (~400 words minimum)
Classify this market on the maturity curve: Emerging → Growth → Mature → Declining. Provide evidence: number of competitors, funding stage, content sophistication, pricing transparency, and feature commoditization signals.

#### 7. Market Drivers & Tailwinds (~400 words minimum)
What macro trends drive growth? Regulatory changes? Technology shifts? Budget reallocations? Use both intelligence data and expert industry knowledge.

#### 8. Market Barriers & Headwinds (~400 words minimum)
What slows adoption? Switching costs? Technical complexity? Regulatory barriers? Budget constraints?

#### 9. Adjacent Market Analysis (~400 words minimum)
**Expert Analysis Required**: What adjacent markets compete for the same budget? What substitute solutions exist? How might market boundaries shift in the next 2-3 years?

#### 10. Competitive Density & Market Structure (~400 words minimum)
How crowded is this market? Map the structure: are there 2-3 dominant players with a long tail, or is it highly fragmented? Use the competitor set as a sample to characterize the broader landscape.

Use markdown tables wherever comparative data can be structured. Cite specific data points with inline links.`,
  },
  industry_dynamics: {
    title: "Industry Dynamics & Trends",
    wordTarget: 5000,
    instructions: `Write an exhaustive Industry Dynamics & Trends section. This should provide the strategic context a CMO needs to understand the forces shaping this market. Every sub-section should be a substantive mini-essay — minimum 3 paragraphs of 4-6 sentences each.

### Required Sub-Sections (with minimum word counts):

#### 1. Industry Evolution & Historical Context (~600 words minimum)
How has this industry evolved over the past 5-10 years? What were the defining inflection points? Where is it headed? Use your expert knowledge to provide historical context that the data alone cannot show.

#### 2. Porter's Five Forces Analysis (~800 words minimum)
**REQUIRED FRAMEWORK**: Apply Porter's Five Forces to this industry:

| Force | Intensity (High/Med/Low) | Key Factors | Impact on Client |
|-------|--------------------------|-------------|------------------|

- **Threat of New Entrants**: Barriers to entry, capital requirements, brand loyalty
- **Bargaining Power of Buyers**: Buyer concentration, switching costs, price sensitivity
- **Bargaining Power of Suppliers**: Technology dependencies, talent scarcity, platform lock-in
- **Threat of Substitutes**: Alternative solutions, DIY approaches, adjacent tools
- **Competitive Rivalry**: Number of competitors, differentiation, exit barriers

Analyze each force in detail with evidence from the intelligence data and your industry expertise.

#### 3. Emerging Trends & Innovation Signals (~800 words minimum)
What trends are reshaping this industry? Reference content themes from competitor websites, social media topics, blog post patterns, and ad messaging. Identify at least 5 major trends with timeline projections:

| Trend | Current Impact | 1-Year Outlook | 3-Year Outlook |
|-------|---------------|----------------|----------------|

#### 4. Buyer Behavior Shifts (~600 words minimum)
How are buyers changing their evaluation and purchasing behavior? What does the content strategy data reveal about how companies are adapting to new buyer journeys? Reference SEO keyword patterns, content types, and social engagement data.

#### 5. Channel Dynamics & Marketing Mix (~600 words minimum)
Which marketing channels dominate in this industry? Analyze LinkedIn activity levels, content strategies, paid media patterns, YouTube investment, and SEO competition. Build a channel effectiveness assessment:

| Channel | Industry Adoption | Investment Level | Effectiveness Signals |
|---------|-------------------|------------------|----------------------|

#### 6. Content & Thought Leadership Landscape (~400 words minimum)
Who is producing content? What topics dominate? Analyze blog content, YouTube activity, LinkedIn post themes, and whitepaper/case study strategies across competitors.

#### 7. Funding, Investment & M&A Landscape (~400 words minimum)
**Expert Analysis Required**: What does the investment landscape look like? Use your knowledge of the industry to discuss recent funding rounds, M&A activity, and what this signals about market trajectory.

#### 8. Regulatory & Compliance Landscape (~400 words minimum)
**Expert Analysis Required**: What regulatory trends affect this market? Data privacy, industry-specific regulations, compliance requirements? How do these create barriers or opportunities?

Cite specific data points with inline links. Use your expert knowledge liberally to provide the strategic depth that raw data alone cannot deliver.`,
  },
  technology_innovation: {
    title: "Technology & Innovation Landscape",
    wordTarget: 5000,
    instructions: `Write an exhaustive Technology & Innovation Landscape section. This should give a technical buyer or CMO a comprehensive understanding of the technology landscape. Every sub-section should be a substantive mini-essay — minimum 3 paragraphs of 4-6 sentences each.

### Required Sub-Sections (with minimum word counts):

#### 1. Core Technology Categories & Stack (~600 words minimum)
Map the technology categories that define this space. What are the core capabilities? How do the technology stacks differ across competitors? Reference product pages and feature descriptions from scraped websites.

#### 2. Feature-by-Feature Comparison (~800 words minimum)
**REQUIRED TABLE**: Build a comprehensive feature comparison matrix from scraped product pages:

| Feature / Capability | ${"{Client}"} | ${"{Competitor 1}"} | ${"{Competitor 2}"} | ... |
|---------------------|--------|---------------|---------------|-----|

Include at least 10-15 feature rows covering core functionality, integrations, analytics, support, and pricing model.

#### 3. Technology Maturity Curve (~600 words minimum)
**Expert Analysis Required**: Map key technologies in this space on a maturity curve (Emerging → Adolescent → Early Mainstream → Mature → Legacy). Discuss which technologies are table-stakes vs. differentiating vs. experimental.

#### 4. Innovation Trends & R&D Signals (~600 words minimum)
What new capabilities are emerging? Reference product updates, blog posts about new features, job postings patterns, and technology messaging from competitor websites. What R&D bets are companies making?

#### 5. Integration Ecosystem Analysis (~500 words minimum)
What integrations and partnerships matter? Reference partner pages, integration directories, and API documentation from scraped websites. Map the ecosystem:

| Integration Category | Key Platforms | Which Competitors Offer | Strategic Importance |
|---------------------|---------------|------------------------|---------------------|

#### 6. Build vs. Buy Analysis (~500 words minimum)
**Expert Analysis Required**: For buyers in this space, what's the build vs. buy calculus? What components are commonly built in-house vs. purchased? How does this affect the competitive landscape?

#### 7. Technology Differentiation Assessment (~500 words minimum)
Where do competitors differentiate on technology? What's truly unique vs. marketing spin? Analyze positioning claims against actual feature evidence from product pages.

#### 8. Technology Adoption Barriers (~400 words minimum)
What prevents adoption of new technology in this space? Integration complexity? Data migration? Talent requirements? Compliance needs?

Cite specific product pages and feature claims with inline links. Supplement with expert technology analysis.`,
  },
  customer_insights: {
    title: "Customer & Audience Insights",
    wordTarget: 5000,
    instructions: `Write an exhaustive Customer & Audience Insights section. This should give the client a granular understanding of who their buyers are, how they buy, and how to reach them. Every sub-section should be a substantive mini-essay — minimum 3 paragraphs of 4-6 sentences each.

### Required Sub-Sections (with minimum word counts):

#### 1. Target Audience Profiles & Buyer Personas (~1,000 words minimum)
**REQUIRED**: Create 3-4 detailed buyer persona cards (200+ words each). Derive personas from website messaging, case study targets, ad audience signals, LinkedIn industry tags, and content themes.

For each persona, include:
- **Title & Role**: Job title, department, seniority
- **Company Profile**: Size, industry, growth stage
- **Pain Points**: Top 3-5 challenges they face
- **Goals & Motivations**: What success looks like for them
- **Information Sources**: Where they research solutions
- **Decision Criteria**: What matters most (price, features, support, brand, compliance)
- **Content Preferences**: What content formats and topics resonate

#### 2. Buyer Journey Mapping (~800 words minimum)
**REQUIRED**: Map the buyer journey for each persona across stages:

| Stage | Buyer Actions | Content Needed | Competitor Coverage | Gaps |
|-------|--------------|----------------|--------------------|----- |

Stages: Awareness → Consideration → Evaluation → Decision → Retention

#### 3. Content-to-Funnel-Stage Mapping (~600 words minimum)
Map existing content from competitors to funnel stages. What content serves which stage? Where are the gaps?

| Funnel Stage | Content Types Available | Top Competitor Examples | Gap Assessment |
|-------------|----------------------|----------------------|----------------|

#### 4. Customer Pain Points & Needs Analysis (~600 words minimum)
Deep analysis of customer pain points derived from: ad messaging themes, case study narratives, product page value propositions, keyword search patterns (informational queries indicate pain points). Organize by severity and frequency.

#### 5. Customer Evidence & Social Proof Landscape (~500 words minimum)
What proof points exist across the competitive set? Case studies, testimonials, customer logos, review platform presence, awards. Build a comparison:

| Evidence Type | ${"{Client}"} | ${"{Competitor 1}"} | ${"{Competitor 2}"} | ... |
|--------------|--------|---------------|---------------|-----|

#### 6. Engagement Benchmarking (~500 words minimum)
How do audiences engage across channels? Compare LinkedIn engagement rates, YouTube view-to-subscriber ratios, website traffic signals (Moz data as proxy), and content sharing patterns.

| Metric | ${"{Client}"} | ${"{Competitor 1}"} | ${"{Competitor 2}"} | Industry Benchmark |
|--------|--------|---------------|---------------|-------------------|

#### 7. Audience Growth & Momentum Signals (~400 words minimum)
Which companies show audience growth momentum? Compare content publishing velocity, social follower growth signals, and new content initiatives.

Cite specific data points with inline links. Use your expert knowledge to fill in buyer behavior patterns that the data suggests but doesn't explicitly state.`,
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
  const webResearchBlock = formatWebResearch(intelligence.web_research);

  const knowledgeBlock = formatKnowledgeBase(input);

  const contextBlock = [
    `# Client: ${input.client.company_name}`,
    input.context?.industry_description
      ? `Industry: ${input.context.industry_description}`
      : null,
    input.context?.solution_category
      ? `Solution Category: ${input.context.solution_category}`
      : null,
    input.context?.target_verticals?.length
      ? `Target Verticals: ${input.context.target_verticals.join(", ")}`
      : null,
    input.instructions
      ? `\n## Strategist Instructions\n${input.instructions}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const user = `${contextBlock}

${knowledgeBlock}

${priorContext}

# Intelligence Data

## Client Company
${clientData}

## Competitor Companies
${competitorData}

${webResearchBlock}

---

# Section to Write: ${config.title}

${config.instructions}

**Target word count: ~${config.wordTarget} words. This is a MINIMUM — write more if the analysis warrants it.**

IMPORTANT REMINDERS:
- Combine the intelligence data with your expert industry knowledge. Do NOT limit yourself to only what's in the data.
- Every sub-section must be a substantive mini-essay (minimum 3 paragraphs of 4-6 sentences each).
- Include ALL required tables with real data. Tables are mandatory, not optional.
- Use inline markdown links \`[source](url)\` when citing specific data points.
- Distinguish between "data-backed findings" (cite the source) and "expert strategic analysis" (your industry knowledge).
- Do NOT pad with generic advice. Every sentence should add specific, actionable value.

Write the complete section now.`;

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
  const webResearchBlock = formatWebResearch(intelligence.web_research);

  const companyNames = [
    input.client.company_name,
    ...input.competitors.map((c) => c.company_name),
  ];

  const knowledgeBlock = formatKnowledgeBase(input);
  const industryLine = input.context?.industry_description
    ? `\nIndustry: ${input.context.industry_description}`
    : "";

  const user = `# Client: ${input.client.company_name}${industryLine}
Companies analyzed: ${companyNames.join(", ")}
${input.instructions ? `\n## Strategist Instructions\n${input.instructions}\n` : ""}
${knowledgeBlock}

${priorContext}

# Intelligence Data

## Client Company
${clientData}

## Competitor Companies
${competitorData}

${webResearchBlock}

---

# Section to Write: Competitive Landscape

Write an exhaustive Competitive Landscape section (~8,000 words). This is the centerpiece of the competitive intelligence report. Every sub-section should be a substantive mini-essay — minimum 3 paragraphs of 4-6 sentences each.

### Required Sub-Sections (with minimum word counts):

#### 1. Competitive Overview & Market Map (~800 words minimum)
Map the competitive landscape comprehensively. Who are the key players? How do they position themselves? Describe the competitive positioning map — where each player sits on axes of [market focus/breadth] and [technology sophistication/simplicity] (or other appropriate axes for this industry). Identify tier 1 (direct competitors), tier 2 (adjacent competitors), and tier 3 (potential disruptors).

#### 2. Positioning Comparison (~800 words minimum)
**REQUIRED TABLE**:

| Company | Tagline/Value Prop | Primary Audience | Key Differentiators | Positioning Strategy |
|---------|-------------------|-----------------|--------------------|--------------------|

Analyze each company's positioning in detail. What messaging themes dominate? Where do positioning claims overlap? Where is there white space?

#### 3. SEO & Organic Comparison (~800 words minimum)
**REQUIRED TABLE**:

| Metric | ${companyNames.join(" | ")} |
|--------|${companyNames.map(() => "---").join("|")}|

Include rows for: Domain Authority, Page Authority, Linking Domains, External Links, Estimated Keyword Count, Top Ranking Keywords, Content Volume, Blog Post Frequency.

Analyze: Who dominates organic? What keyword gaps exist? Where can the client win?

#### 4. Social Media Comparison (~800 words minimum)
**REQUIRED TABLE**:

| Platform / Metric | ${companyNames.join(" | ")} |
|-------------------|${companyNames.map(() => "---").join("|")}|

Include rows for: LinkedIn Followers, LinkedIn Post Frequency, LinkedIn Engagement Rate, YouTube Subscribers, YouTube Videos, YouTube Total Views.

Analyze engagement quality, content themes, and audience growth signals.

#### 5. Paid Media Comparison (~800 words minimum)
**REQUIRED TABLE**:

| Metric | ${companyNames.join(" | ")} |
|--------|${companyNames.map(() => "---").join("|")}|

Include rows for: Estimated Monthly PPC Spend, Top PPC Keywords, Ad Formats Used, LinkedIn Ad Presence, Google Ad Presence, Key Messaging Themes.

Analyze ad strategy differences, budget allocation signals, and creative approaches.

#### 6. Content Strategy Comparison (~800 words minimum)
Compare content types (blogs, case studies, whitepapers, videos, webinars), publishing frequency, topic focus areas, and content quality. Build a content matrix:

| Content Type | ${companyNames.join(" | ")} |
|-------------|${companyNames.map(() => "---").join("|")}|

#### 7. Content Gap Analysis (~600 words minimum)
Identify specific content gaps where the client is underperforming vs. competitors. What topics, formats, and channels are competitors using that the client is not? Prioritize by impact.

#### 8. Strengths & Vulnerabilities Matrix (~800 words minimum)
**REQUIRED TABLE** for each competitor:

| Company | Key Strengths | Strategic Vulnerabilities | Exploitable Gaps |
|---------|--------------|--------------------------|-----------------|

Analyze each competitor's strengths and vulnerabilities in detail. What can the client exploit?

#### 9. Market Share & Competitive Position Estimation (~400 words minimum)
**Expert Analysis Required**: Based on all available signals (traffic, social following, ad spend, content volume, brand recognition), estimate relative market position. Who's gaining? Who's declining?

#### 10. Competitive Gaps & Strategic Opportunities (~600 words minimum)
Synthesize all comparisons into specific, prioritized opportunities for the client. What are the top 5-7 competitive advantages the client can build?

**Target word count: ~8,000 words. This is a MINIMUM.**

IMPORTANT REMINDERS:
- ALL tables listed above are REQUIRED with real data from the intelligence package.
- Use inline markdown links \`[source](url)\` when citing data.
- Combine data analysis with expert strategic interpretation.
- Every sub-section must be 3+ paragraphs minimum.

Write the complete section now.`;

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
  const webResearchBlock = formatWebResearch(intelligence.web_research);

  const user = `# Client: ${input.client.company_name}
# Competitor Deep-Dive: ${competitorIntel.company_name}

${priorContext}

# Client Intelligence (for comparison)
${clientData}

# Competitor Intelligence
${competitorData}

${webResearchBlock}

---

# Section to Write: ${competitorIntel.company_name} — Competitive Deep-Dive

Write a detailed competitive deep-dive for ${competitorIntel.company_name} (~4,000 words). This should be comprehensive enough that a sales team could use it to compete against this company. Every sub-section should be a substantive mini-essay — minimum 3 paragraphs of 4-6 sentences each.

### Required Sub-Sections (with minimum word counts):

#### 1. Company Overview & Market Position (~500 words minimum)
Who they are, what they do, their market position, company size, and strategic focus. Use their website content and LinkedIn profile. Reference any web research articles about them.

#### 2. Product & Solution Analysis (~600 words minimum)
What do they offer? How do they structure their product/solution portfolio? Reference specific product pages. What is their pricing model (if visible)? What customer segments does each product serve?

#### 3. SWOT Analysis (~600 words minimum)
**REQUIRED FRAMEWORK**:

| | Positive | Negative |
|---|----------|----------|
| **Internal** | **Strengths**: ... | **Weaknesses**: ... |
| **External** | **Opportunities**: ... | **Threats**: ... |

Provide detailed analysis for each quadrant (minimum 4-5 points each with explanation).

#### 4. Marketing Strategy Assessment — Channel by Channel (~800 words minimum)

**REQUIRED TABLE**:

| Channel | Performance Level | Key Metrics | Notable Tactics | vs. ${input.client.company_name} |
|---------|------------------|-------------|-----------------|------|

Analyze each channel in detail:
- **Website & Content**: Quality, structure, messaging, conversion approach, content depth
- **SEO Performance**: Domain authority, keyword strategy, content gaps, backlink profile
- **Social Media**: LinkedIn activity, YouTube strategy, engagement quality, posting cadence
- **Paid Media**: Ad strategy, messaging themes, spend signals, creative approach, platform mix

#### 5. Threat Assessment (~400 words minimum)
How much of a competitive threat is this company to ${input.client.company_name}? In which specific areas? Is the threat growing or declining? What signals indicate their trajectory?

#### 6. Opportunity Assessment (~400 words minimum)
Where is ${competitorIntel.company_name} weak or underinvesting? What specific opportunities does this create for ${input.client.company_name}?

#### 7. Actionable Recommendations (~500 words minimum)
Provide **5+ specific, actionable recommendations** for how ${input.client.company_name} should compete against ${competitorIntel.company_name}. Each recommendation should include:
- The specific action to take
- Why it will work (evidence from the data)
- Expected impact
- Implementation priority (High/Medium/Low)

**Target word count: ~4,000 words. This is a MINIMUM.**

IMPORTANT REMINDERS:
- Use inline markdown links \`[source](url)\` when citing data.
- The SWOT matrix and channel performance table are REQUIRED.
- Combine data analysis with expert strategic interpretation.
- Provide specific, actionable insights — not generic competitive advice.

Write the complete section now.`;

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

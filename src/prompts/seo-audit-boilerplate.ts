/**
 * SEO/AEO Audit Section Boilerplate
 *
 * Static descriptions for each section of the SEO/AEO Audit.
 * These are injected into the output during assembly — Claude does NOT generate them.
 * The frontend renders these as introductory text for each section.
 *
 * Edit the copy here. The schema just receives the string.
 */

export const SEO_AUDIT_BOILERPLATE = {
  technical_seo:
    "This section provides a comprehensive assessment of your website's technical health — the foundation upon which all SEO success is built. Our analysis combines data from multiple industry-leading intelligence platforms: DataForSEO (site crawl, keyword rankings, backlinks, SERP analysis, AI visibility), Moz (Domain Authority, Spam Score, page authority), Keywords Everywhere (search volume trends, CPC, related keywords), and Google PageSpeed Insights (Core Web Vitals). We crawled your site to identify critical issues affecting search engine accessibility, indexability, and user experience. The analysis covers crawlability, Core Web Vitals performance, structured data implementation, redirect chains, and page-level optimization scores. Each issue is prioritized by severity and accompanied by specific remediation steps.",

  keyword_landscape:
    "Understanding your current keyword footprint is essential for identifying where you're winning and where opportunities exist. This section maps your entire organic search presence — every keyword your site ranks for, organized into thematic clusters with search intent classification. We analyze ranking distribution, traffic potential, and competitive positioning to give you a clear picture of your organic visibility. The keyword clusters reveal your content strengths and highlight areas where strategic content development can capture significant additional search traffic.",

  content_gap:
    "Content gap analysis reveals the keywords your competitors rank for that you don't — representing untapped opportunities to capture qualified search traffic. We analyzed the keyword overlap between your domain and each competitor to identify high-value keywords where you have no presence. These gaps are categorized by priority: quick wins (low difficulty, high volume), strategic gaps (high difficulty but critical for competitive positioning), and high-value opportunities that represent significant revenue potential. Each gap includes competitor position data and recommended content approaches.",

  serp_features_aeo:
    "The search landscape has evolved beyond traditional blue links. Featured snippets, People Also Ask boxes, and AI-generated overviews now dominate above-the-fold real estate. This section analyzes your visibility across these modern SERP features and evaluates your presence in AI-powered search experiences (AEO — Answer Engine Optimization). We tested your brand's visibility across AI engines including Google AI Overview, ChatGPT, and Perplexity to assess how well your content is being surfaced in conversational search. The findings reveal specific optimization opportunities to capture these high-visibility placements.",

  backlink_profile:
    "Backlinks remain one of the strongest ranking signals in search. This section provides a complete audit of your backlink profile — total links, referring domain diversity, anchor text distribution, and link quality metrics. We compare your profile against competitors to identify authority gaps and highlight specific domains that link to your competitors but not to you. These gap opportunities represent achievable link-building targets that can meaningfully improve your domain authority and search rankings.",

  competitive_search:
    "Understanding your competitive search landscape is critical for strategic positioning. This section profiles your organic search presence alongside each competitor, comparing total keyword coverage, top-10 rankings, estimated organic traffic, and domain authority. We identify each player's content strengths and weaknesses to reveal differentiation opportunities — areas where you can establish topical authority that competitors haven't claimed. This competitive intelligence informs both content strategy and link-building priorities.",

  strategic_recommendations:
    "This section synthesizes all findings into a prioritized action plan organized by implementation timeframe. Quick wins are high-impact, low-effort changes that can improve rankings within weeks. Medium-term initiatives require more resources but drive substantial organic growth over 3-6 months. Long-term strategic plays position your brand for sustained competitive advantage. Each recommendation includes effort/impact scoring, expected timeframe, and the specific KPI it targets — giving your team a clear execution roadmap.",
} as const;

export type SeoAuditSection = keyof typeof SEO_AUDIT_BOILERPLATE;

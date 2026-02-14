import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { SeoAuditInput, SeoAuditInputSchema } from "../src/types/seo-audit-input";
import { GeneratedSeoAuditOutput, DataSource } from "../src/types/seo-audit-output";
import { SeoIntelligencePackage } from "../src/types/seo-audit-intelligence";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { SEO_AUDIT_BOILERPLATE } from "../src/prompts/seo-audit-boilerplate";
import {
  buildTechnicalSeoPrompt,
  buildKeywordStrategyPrompt,
  buildSerpAeoPrompt,
  buildAuthorityBacklinksPrompt,
  buildCompetitiveSearchPrompt,
  buildStrategicRecommendationsPrompt,
} from "../src/prompts/seo-audit";
import { gatherAllSeoIntelligence, GatherSeoConfig } from "../src/lib/gather-seo-intelligence";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 32000;

function buildDataSources(intel: SeoIntelligencePackage): DataSource[] {
  const sources: DataSource[] = [];

  // DataForSEO — always attempted, active if we got crawl or keyword data
  const hasOnPage = !!intel.onpage_summary;
  const hasKeywords = (intel.client.ranked_keywords?.length ?? 0) > 0;
  const hasBacklinks = !!intel.client.backlink_summary;
  const hasSerp = (intel.serp_results?.length ?? 0) > 0;
  const hasAeo = (intel.llm_mentions?.length ?? 0) > 0 || (intel.llm_responses?.length ?? 0) > 0;
  const dfsParts: string[] = [];
  if (hasOnPage) dfsParts.push("site crawl & technical analysis");
  if (hasKeywords) dfsParts.push("keyword rankings & content gaps");
  if (hasBacklinks) dfsParts.push("backlink profile & competitor link analysis");
  if (hasSerp) dfsParts.push("SERP feature analysis");
  if (hasAeo) dfsParts.push("AI engine visibility testing");
  sources.push({
    key: "dataforseo",
    name: "DataForSEO",
    description: dfsParts.length > 0
      ? `Provided ${dfsParts.join(", ")}`
      : "Site crawl, keyword rankings, backlink analysis, SERP features, AI visibility",
    active: hasOnPage || hasKeywords || hasBacklinks,
  });

  // Moz
  const hasMoz = !!intel.client.moz_metrics;
  const hasMozTopPages = (intel.client.moz_top_pages?.length ?? 0) > 0;
  const mozParts: string[] = [];
  if (hasMoz) mozParts.push("Domain Authority, Spam Score & linking domain metrics");
  if (hasMozTopPages) mozParts.push("top pages by page authority");
  sources.push({
    key: "moz",
    name: "Moz",
    description: mozParts.length > 0
      ? `Provided ${mozParts.join(", ")} for client and competitors`
      : "Domain Authority, Spam Score, linking domains, top pages by authority",
    active: hasMoz,
  });

  // Keywords Everywhere
  const hasKe = !!intel.keywords_everywhere;
  const keParts: string[] = [];
  if (hasKe) {
    if (intel.keywords_everywhere!.keyword_metrics.length > 0) keParts.push("12-month search volume trends & CPC data");
    if (intel.keywords_everywhere!.related_keywords.length > 0) keParts.push("related keyword discovery");
    if (intel.keywords_everywhere!.pasf_keywords.length > 0) keParts.push("People Also Search For expansion");
    if (intel.keywords_everywhere!.domain_traffic.length > 0) keParts.push("domain traffic estimates");
  }
  sources.push({
    key: "keywords_everywhere",
    name: "Keywords Everywhere",
    description: keParts.length > 0
      ? `Provided ${keParts.join(", ")}`
      : "Search volume trends, CPC, related keywords, People Also Search For, domain traffic estimates",
    active: hasKe,
  });

  // Google PageSpeed Insights
  const hasPageSpeed = (intel.pagespeed_results?.length ?? 0) > 0;
  sources.push({
    key: "google_pagespeed",
    name: "Google PageSpeed Insights",
    description: hasPageSpeed
      ? `Provided Core Web Vitals and performance scores for ${intel.pagespeed_results!.length} URL(s)`
      : "Core Web Vitals field data and performance scoring",
    active: hasPageSpeed,
  });

  // Google Search Console
  const hasGsc = !!intel.google_search_console;
  const gscParts: string[] = [];
  if (hasGsc) {
    const gsc = intel.google_search_console!;
    if (gsc.top_queries.length > 0) gscParts.push(`${gsc.top_queries.length} search queries with real click data`);
    if (gsc.top_pages.length > 0) gscParts.push(`${gsc.top_pages.length} top pages by clicks`);
    if (gsc.sitemaps.length > 0) gscParts.push(`${gsc.sitemaps.length} sitemaps`);
  }
  sources.push({
    key: "google_search_console",
    name: "Google Search Console",
    description: hasGsc && gscParts.length > 0
      ? `Provided ${gscParts.join(", ")} (${intel.google_search_console!.date_range_start} to ${intel.google_search_console!.date_range_end})`
      : "Real click/impression data, index coverage, and search query analytics. Available when client connects their GSC property.",
    active: hasGsc,
  });

  return sources;
}

async function callClaude(
  client: Anthropic,
  system: string,
  user: string
): Promise<string> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });

  const response = await stream.finalMessage();

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text;
}

export const generateSeoAudit = task({
  id: "generate-seo-audit",
  maxDuration: 2700, // 45 minutes — crawl polling + 6 Claude calls
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: SeoAuditInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<GeneratedSeoAuditOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    // Validate input
    const input = SeoAuditInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const claude = new Anthropic({ apiKey });

    // ═══════════════════════════════════════════════
    // Phase 1: Intelligence Gathering
    // ═══════════════════════════════════════════════
    metadata.set("phase", "intelligence_gathering");
    metadata.set("progress", "Gathering SEO intelligence (crawl, keywords, backlinks, SERP, AEO)...");

    const seoConfig: GatherSeoConfig = {
      dataforseoLogin: process.env.DATAFORSEO_LOGIN,
      dataforseoPassword: process.env.DATAFORSEO_PASSWORD,
      mozApiKey: process.env.MOZ_API_KEY,
      pageSpeedApiKey: process.env.GOOGLE_PAGESPEED_API_KEY,
      keywordsEverywhereApiKey: process.env.KEYWORDS_EVERYWHERE_API_KEY,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      googleGscRefreshToken: process.env.GOOGLE_GSC_REFRESH_TOKEN,
    };

    const intel = await gatherAllSeoIntelligence(input, seoConfig);

    console.log(`[SEO Audit] Intelligence gathering complete. Errors: ${intel.errors.length}`);
    if (intel.errors.length > 0) {
      console.warn(`[SEO Audit] Errors:`, intel.errors);
    }

    // Accumulated results from prior calls — carries forward for coherence
    const accumulated: Record<string, unknown> = {};

    // ═══════════════════════════════════════════════
    // Phase 2: Claude Analysis (6 sequential calls)
    // ═══════════════════════════════════════════════

    // Call 1: Technical SEO Assessment
    metadata.set("phase", "call_1_technical_seo");
    metadata.set("progress", "Analyzing technical SEO...");

    const call1Prompt = buildTechnicalSeoPrompt(input, intel);
    const call1Response = await callClaude(claude, call1Prompt.system, call1Prompt.user);
    const call1Result = extractJson(call1Response) as {
      technical_seo: Record<string, unknown>;
    };
    accumulated.technical_seo = call1Result.technical_seo;

    // Call 2: Keyword Strategy + Content Gaps
    metadata.set("phase", "call_2_keyword_content_gap");
    metadata.set("progress", "Analyzing keyword landscape and content gaps...");

    const call2Prompt = buildKeywordStrategyPrompt(input, intel, accumulated);
    const call2Response = await callClaude(claude, call2Prompt.system, call2Prompt.user);
    const call2Result = extractJson(call2Response) as {
      keyword_landscape: Record<string, unknown>;
      content_gap: Record<string, unknown>;
    };
    accumulated.keyword_landscape = call2Result.keyword_landscape;
    accumulated.content_gap = call2Result.content_gap;

    // Call 3: SERP Features & AEO Analysis
    metadata.set("phase", "call_3_serp_aeo");
    metadata.set("progress", "Analyzing SERP features and AI engine visibility...");

    const call3Prompt = buildSerpAeoPrompt(input, intel, accumulated);
    const call3Response = await callClaude(claude, call3Prompt.system, call3Prompt.user);
    const call3Result = extractJson(call3Response) as {
      serp_features_aeo: Record<string, unknown>;
    };
    accumulated.serp_features_aeo = call3Result.serp_features_aeo;

    // Call 4: Authority & Backlinks
    metadata.set("phase", "call_4_authority_backlinks");
    metadata.set("progress", "Analyzing backlink profile and authority...");

    const call4Prompt = buildAuthorityBacklinksPrompt(input, intel, accumulated);
    const call4Response = await callClaude(claude, call4Prompt.system, call4Prompt.user);
    const call4Result = extractJson(call4Response) as {
      backlink_profile: Record<string, unknown>;
    };
    accumulated.backlink_profile = call4Result.backlink_profile;

    // Call 5: Competitive Search Landscape
    metadata.set("phase", "call_5_competitive_search");
    metadata.set("progress", "Building competitive search landscape...");

    const call5Prompt = buildCompetitiveSearchPrompt(input, intel, accumulated);
    const call5Response = await callClaude(claude, call5Prompt.system, call5Prompt.user);
    const call5Result = extractJson(call5Response) as {
      competitive_search: Record<string, unknown>;
    };
    accumulated.competitive_search = call5Result.competitive_search;

    // Call 6: Strategic Recommendations (synthesizes all)
    metadata.set("phase", "call_6_strategic_recommendations");
    metadata.set("progress", "Generating strategic recommendations...");

    const call6Prompt = buildStrategicRecommendationsPrompt(input, intel, accumulated);
    const call6Response = await callClaude(claude, call6Prompt.system, call6Prompt.user);
    const call6Result = extractJson(call6Response) as {
      strategic_recommendations: Record<string, unknown>;
    };
    accumulated.strategic_recommendations = call6Result.strategic_recommendations;

    // ═══════════════════════════════════════════════
    // Phase 3: Assembly
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final SEO audit output...");

    const title =
      input.title || `SEO/AEO Audit: ${input.client.company_name}`;

    const execSummary = (call6Result.strategic_recommendations as { executive_summary?: string })
      ?.executive_summary || `Comprehensive SEO/AEO audit for ${input.client.company_name} analyzing technical health, keyword landscape, content gaps, SERP features, backlink profile, and competitive positioning.`;

    const output: GeneratedSeoAuditOutput = {
      type: "seo_audit",
      title,
      summary: execSummary,

      technical_seo: {
        section_description: SEO_AUDIT_BOILERPLATE.technical_seo,
        ...(call1Result.technical_seo as Omit<GeneratedSeoAuditOutput["technical_seo"], "section_description">),
      },

      keyword_landscape: {
        section_description: SEO_AUDIT_BOILERPLATE.keyword_landscape,
        ...(call2Result.keyword_landscape as Omit<GeneratedSeoAuditOutput["keyword_landscape"], "section_description">),
      },

      content_gap: {
        section_description: SEO_AUDIT_BOILERPLATE.content_gap,
        ...(call2Result.content_gap as Omit<GeneratedSeoAuditOutput["content_gap"], "section_description">),
      },

      serp_features_aeo: {
        section_description: SEO_AUDIT_BOILERPLATE.serp_features_aeo,
        ...(call3Result.serp_features_aeo as Omit<GeneratedSeoAuditOutput["serp_features_aeo"], "section_description">),
      },

      backlink_profile: {
        section_description: SEO_AUDIT_BOILERPLATE.backlink_profile,
        ...(call4Result.backlink_profile as Omit<GeneratedSeoAuditOutput["backlink_profile"], "section_description">),
      },

      competitive_search: {
        section_description: SEO_AUDIT_BOILERPLATE.competitive_search,
        ...(call5Result.competitive_search as Omit<GeneratedSeoAuditOutput["competitive_search"], "section_description">),
      },

      strategic_recommendations: {
        section_description: SEO_AUDIT_BOILERPLATE.strategic_recommendations,
        ...(call6Result.strategic_recommendations as Omit<GeneratedSeoAuditOutput["strategic_recommendations"], "section_description">),
      },

      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        domain_audited: input.client.domain,
        competitors_analyzed: input.competitors.map((c) => c.domain),
        intelligence_errors: intel.errors,
        data_sources: buildDataSources(intel),
        pages_crawled: intel.onpage_summary?.pages_crawled,
      },
    };

    // ═══════════════════════════════════════════════
    // Phase 4: Webhook Callback Delivery
    // ═══════════════════════════════════════════════
    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(
        _callback,
        _jobId || "unknown",
        "completed",
        output
      );
    }

    metadata.set("progress", "Complete");
    return output;
  },
});

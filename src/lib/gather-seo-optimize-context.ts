import {
  DataForSeoClient,
  getSerpResults,
  getSearchIntent,
  getKeywordOverview,
  getRelatedKeywords,
  getDomainIntersection,
  getLlmMentions,
  getChatGptResponses,
  getPerplexityResponses,
} from "./dataforseo";
import {
  SeoEnrichKeywordRequest,
  SeoEnrichKeywordResponse,
} from "../types/seo-enrich-keyword";

// ISO country code → DataForSEO location code. Extend as needed; falls back to US.
const COUNTRY_TO_LOCATION: Record<string, number> = {
  us: 2840,
  ca: 2124,
  gb: 2826,
  au: 2036,
  de: 2276,
  fr: 2250,
  es: 2724,
  it: 2380,
  nl: 2528,
  in: 2356,
  br: 2076,
  mx: 2484,
  jp: 2392,
};

function locationCodeFor(country: string): number {
  return COUNTRY_TO_LOCATION[country.toLowerCase()] ?? COUNTRY_TO_LOCATION.us;
}

function stripDomain(input: string): string {
  return input.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
}

interface OrchestratorConfig {
  dataforseoLogin: string;
  dataforseoPassword: string;
}

export class KeywordNotFoundError extends Error {
  constructor(keyword: string) {
    super(`No DataForSEO data available for keyword "${keyword}"`);
    this.name = "KeywordNotFoundError";
  }
}

/**
 * Stateless SEO intelligence gatherer for the optimize flow.
 * Runs all DFS sub-fetches in parallel; per-stream failures surface in `errors[]`
 * rather than failing the whole call. Only a missing keyword overview is fatal.
 */
export async function gatherSeoOptimizeContext(
  req: SeoEnrichKeywordRequest,
  config: OrchestratorConfig
): Promise<SeoEnrichKeywordResponse> {
  const errors: string[] = [];
  const client = new DataForSeoClient(config.dataforseoLogin, config.dataforseoPassword);
  const locationCode = locationCodeFor(req.country);
  const keyword = req.target_keyword.trim();

  const clientDomain = req.client_domain ? stripDomain(req.client_domain) : undefined;
  const competitorDomains = (req.competitor_domains || []).map(stripDomain);
  const includeContentGap = !!clientDomain && competitorDomains.length > 0;
  const includeAeo = !!req.client_brand;

  // ── Fan-out: every sub-call runs concurrently ─────────────────────────────
  const overviewPromise = getKeywordOverview(client, keyword, locationCode).catch((err) => {
    errors.push(`Keyword overview failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  });

  const intentPromise = getSearchIntent(client, [keyword], locationCode).catch((err) => {
    errors.push(`Search intent failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  });

  const serpPromise = getSerpResults(client, [keyword], locationCode, 1).catch((err) => {
    errors.push(`SERP fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  });

  const relatedPromise = getRelatedKeywords(client, keyword, locationCode, 30).catch((err) => {
    errors.push(`Related keywords failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  });

  const contentGapPromise: Promise<
    Array<{
      keyword: string;
      competitor_position: number;
      client_position: number | null;
      search_volume: number;
    }>
  > = includeContentGap
    ? Promise.allSettled(
        competitorDomains.map((competitor) =>
          getDomainIntersection(client, clientDomain!, competitor, locationCode, 100)
        )
      ).then((settled) => {
        const merged = new Map<
          string,
          { keyword: string; competitor_position: number; client_position: number | null; search_volume: number }
        >();
        settled.forEach((entry, idx) => {
          if (entry.status === "rejected") {
            errors.push(
              `Content gap failed for ${competitorDomains[idx]}: ${
                entry.reason instanceof Error ? entry.reason.message : String(entry.reason)
              }`
            );
            return;
          }
          for (const gap of entry.value) {
            const competitorPosition =
              Object.values(gap.competitor_positions).find((p) => p > 0) ?? 0;
            if (!competitorPosition) continue;
            const existing = merged.get(gap.keyword);
            if (!existing || existing.search_volume < gap.search_volume) {
              merged.set(gap.keyword, {
                keyword: gap.keyword,
                competitor_position: competitorPosition,
                client_position: gap.client_position ?? null,
                search_volume: gap.search_volume,
              });
            }
          }
        });
        return Array.from(merged.values())
          .sort((a, b) => b.search_volume - a.search_volume)
          .slice(0, 15);
      })
    : Promise.resolve([]);

  const aeoPromise: Promise<{
    llm_mentions_count: number;
    appears_in_chatgpt_responses: boolean;
    appears_in_perplexity_responses: boolean;
    competing_brands_in_llm_responses: string[];
  } | null> = includeAeo
    ? Promise.allSettled([
        getLlmMentions(client, req.client_brand!, [keyword]),
        getChatGptResponses(client, [keyword]),
        getPerplexityResponses(client, [keyword]),
      ]).then(([mentionsRes, chatgptRes, perplexityRes]) => {
        const brand = req.client_brand!.toLowerCase();

        const mentions = mentionsRes.status === "fulfilled" ? mentionsRes.value : [];
        if (mentionsRes.status === "rejected") {
          errors.push(
            `LLM mentions failed: ${
              mentionsRes.reason instanceof Error ? mentionsRes.reason.message : String(mentionsRes.reason)
            }`
          );
        }

        const chatgpt = chatgptRes.status === "fulfilled" ? chatgptRes.value : [];
        if (chatgptRes.status === "rejected") {
          errors.push(
            `ChatGPT check failed: ${
              chatgptRes.reason instanceof Error ? chatgptRes.reason.message : String(chatgptRes.reason)
            }`
          );
        }

        const perplexity = perplexityRes.status === "fulfilled" ? perplexityRes.value : [];
        if (perplexityRes.status === "rejected") {
          errors.push(
            `Perplexity check failed: ${
              perplexityRes.reason instanceof Error ? perplexityRes.reason.message : String(perplexityRes.reason)
            }`
          );
        }

        const llmMentionsCount = mentions.filter((m) => m.brand_mentioned).length;
        const chatgptHit = chatgpt.some((r) => r.response_text?.toLowerCase().includes(brand));
        const perplexityHit = perplexity.some((r) =>
          r.response_text?.toLowerCase().includes(brand)
        );

        const competing = new Set<string>();
        for (const m of mentions) {
          for (const c of m.competitors_mentioned ?? []) {
            if (c && c.toLowerCase() !== brand) competing.add(c);
          }
        }

        return {
          llm_mentions_count: llmMentionsCount,
          appears_in_chatgpt_responses: chatgptHit,
          appears_in_perplexity_responses: perplexityHit,
          competing_brands_in_llm_responses: Array.from(competing),
        };
      })
    : Promise.resolve(null);

  const [overview, intentResults, serpResults, related, contentGap, aeo] = await Promise.all([
    overviewPromise,
    intentPromise,
    serpPromise,
    relatedPromise,
    contentGapPromise,
    aeoPromise,
  ]);

  // Hard fail only when DFS truly knows nothing about the keyword.
  if (!overview) {
    throw new KeywordNotFoundError(keyword);
  }

  const intent = intentResults[0];
  const serp = serpResults[0];

  // Derive ranking_status by scanning the SERP we already pulled (no extra labs call).
  let rankingStatus: SeoEnrichKeywordResponse["ranking_status"] | undefined;
  if (clientDomain) {
    const match = serp?.organic_results.find((r) => stripDomain(r.domain) === clientDomain);
    rankingStatus = match
      ? { client_currently_ranks: true, client_position: match.position, client_url: match.url }
      : { client_currently_ranks: false };
  }

  const topOrganic = (serp?.organic_results ?? []).slice(0, 10).map((r) => ({
    position: r.position,
    url: r.url,
    title: r.title,
    domain: r.domain,
  }));

  const aiOverview = serp?.ai_overview
    ? {
        present: serp.ai_overview.present,
        content: serp.ai_overview.content,
        references: serp.ai_overview.references,
      }
    : null;

  const peopleAlsoAsk = (serp?.people_also_ask ?? []).map((q) => ({
    question: q.question,
    expanded_answer: q.expanded_element,
  }));

  const featuredSnippet = serp?.featured_snippet
    ? {
        url: serp.featured_snippet.url,
        title: serp.featured_snippet.title,
        description: serp.featured_snippet.description,
      }
    : null;

  const response: SeoEnrichKeywordResponse = {
    target_keyword: keyword,
    country: req.country,
    fetched_at: new Date().toISOString(),
    keyword_data: {
      volume: overview.search_volume,
      difficulty: overview.keyword_difficulty,
      cpc_usd: overview.cpc,
      search_intent: {
        main: intent?.intent ?? overview.main_intent ?? null,
        secondary: intent?.secondary_intent ?? overview.secondary_intent ?? null,
        // search_intent/live doesn't surface a probability scalar; left null until/if exposed.
        probability: null,
      },
    },
    serp: {
      top_organic: topOrganic,
      ai_overview: aiOverview,
      people_also_ask: peopleAlsoAsk,
      featured_snippet: featuredSnippet,
      serp_features: serp?.serp_features ?? [],
    },
    related_keywords: related.slice(0, 15).map((r) => ({
      keyword: r.keyword,
      volume: r.search_volume,
      difficulty: r.keyword_difficulty,
      intent: r.intent,
    })),
    errors,
  };

  if (includeContentGap) {
    response.content_gap = contentGap;
  }
  if (aeo) {
    response.aeo = aeo;
  }
  if (rankingStatus) {
    response.ranking_status = rankingStatus;
  }

  return response;
}

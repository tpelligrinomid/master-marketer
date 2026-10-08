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

// The live LLM calls can take 5–20s; cap them well inside the endpoint's 15s
// budget so a slow engine lands in `errors[]` instead of timing out the request.
const AEO_TIMEOUT_MS = 10_000;
const STREAM_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let handle: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    handle = setTimeout(() => reject(new Error(`${label} exceeded ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(handle));
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
  // Each stream is capped inside the endpoint budget, so one slow upstream call
  // degrades to an `errors[]` entry instead of a 504 that discards everything.
  const timings: Record<string, number> = {};
  const stream = <T>(label: string, work: Promise<T>, fallback: T): Promise<T> => {
    const started = Date.now();
    return withTimeout(work, STREAM_TIMEOUT_MS, label)
      .catch((err) => {
        errors.push(`${label} failed: ${err instanceof Error ? err.message : String(err)}`);
        return fallback;
      })
      .finally(() => {
        timings[label] = Date.now() - started;
      });
  };

  const overviewPromise = stream("Keyword overview", getKeywordOverview(client, keyword, locationCode), null);
  const intentPromise = stream("Search intent", getSearchIntent(client, [keyword], locationCode), []);
  const serpPromise = stream("SERP fetch", getSerpResults(client, [keyword], locationCode, 1, 0), []);
  const relatedPromise = stream(
    "Related keywords",
    getRelatedKeywords(client, keyword, locationCode, 30),
    []
  );

  const contentGapPromise: Promise<
    Array<{
      keyword: string;
      competitor_position: number;
      client_position: number | null;
      search_volume: number;
    }>
  > = includeContentGap
    ? stream("Content gap", Promise.allSettled(
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
      }), [])
    : Promise.resolve([]);

  // A bare keyword gets a definition back; a buyer's question is what makes an
  // engine name vendors, which is what brand visibility is about.
  const aeoPrompt = `Which companies or products would you recommend for "${keyword}"?`;

  const aeoPromise: Promise<SeoEnrichKeywordResponse["aeo"] | null> = includeAeo
    ? Promise.allSettled([
        withTimeout(getLlmMentions(client, req.client_brand!, [keyword]), AEO_TIMEOUT_MS, "LLM mentions"),
        withTimeout(getChatGptResponses(client, [aeoPrompt]), AEO_TIMEOUT_MS, "ChatGPT"),
        withTimeout(getPerplexityResponses(client, [aeoPrompt]), AEO_TIMEOUT_MS, "Perplexity"),
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

        const responses = [...chatgpt, ...perplexity].map((r) => {
          const text = r.response_text ?? "";
          const idx = text.toLowerCase().indexOf(brand);
          const excerpt = !text
            ? null
            : idx >= 0
              ? text.slice(Math.max(0, idx - 200), idx + brand.length + 200)
              : text.slice(0, 400);
          return {
            engine: r.engine as "chatgpt" | "perplexity",
            prompt: r.query,
            brand_mentioned: idx >= 0,
            excerpt,
            cited_urls: (r.references ?? []).map((ref) => ref.url).slice(0, 10),
          };
        });

        return {
          llm_mentions_count: llmMentionsCount,
          appears_in_chatgpt_responses: chatgptHit,
          appears_in_perplexity_responses: perplexityHit,
          competing_brands_in_llm_responses: Array.from(competing),
          responses,
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

  console.log(`[seo/enrich-keyword] "${keyword}" stream timings (ms):`, timings);

  // Hard fail only when DFS truly knows nothing about the keyword. A failed or
  // timed-out overview call is an upstream problem, not a missing keyword.
  if (!overview) {
    const overviewError = errors.find((e) => e.startsWith("Keyword overview failed"));
    if (overviewError) throw new Error(overviewError);
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

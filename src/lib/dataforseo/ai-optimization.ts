import { DataForSeoClient } from "./client";
import { LlmMention, LlmResponse } from "../../types/seo-audit-intelligence";

// Model names resolve to the latest version of each base model.
const CHATGPT_MODEL = "gpt-4.1-mini";
const PERPLEXITY_MODEL = "sonar";

/**
 * Run fn over items concurrently. Rejected items are dropped, but if every item
 * fails the first error is thrown, so callers can report it instead of reading
 * an empty list as "brand not mentioned".
 */
async function settleAll<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = await Promise.allSettled(items.map(fn));
  const fulfilled = results
    .filter((r): r is PromiseFulfilledResult<Awaited<R>> => r.status === "fulfilled")
    .map((r) => r.value as R);
  const firstRejection = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (fulfilled.length === 0 && firstRejection) throw firstRejection.reason;
  return fulfilled;
}

function excerptAround(text: string, needle: string, radius = 150): string {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, radius * 2);
  return text.slice(Math.max(0, idx - radius), idx + needle.length + radius);
}

interface SearchMentionsItem {
  platform?: string;
  question?: string;
  answer?: string;
  sources?: Array<{ domain?: string; url?: string; title?: string }>;
  brand_entities?: Array<{ title?: string }> | null;
}

interface SearchMentionsResult {
  items?: SearchMentionsItem[] | null;
}

const PLATFORM_ENGINE: Record<string, string> = {
  google: "google_ai_overview",
  chat_gpt: "chatgpt",
};

/**
 * Check whether the brand appears in the AI answers DataForSEO has recorded for
 * each keyword (Google AI Overviews and ChatGPT), via the LLM Mentions database.
 * Returns one entry per keyword per engine that has recorded answers; a keyword
 * with no recorded answers is omitted rather than reported as "not mentioned".
 */
export async function getLlmMentions(
  client: DataForSeoClient,
  brandName: string,
  keywords: string[]
): Promise<LlmMention[]> {
  if (keywords.length === 0) return [];
  const brand = brandName.toLowerCase();

  const perKeyword = await settleAll(keywords.slice(0, 20), async (keyword) => {
    const response = await client.request<SearchMentionsResult>(
      "POST",
      "ai_optimization/llm_mentions/search_mentions/live",
      [
        {
          target: [{ keyword, search_scope: ["question"], match_type: "partial_match" }],
          location_code: 2840,
          language_code: "en",
          limit: 20,
        },
      ]
    );

    const items = client.extractFirstResult(response)?.items ?? [];
    const byPlatform = new Map<string, SearchMentionsItem[]>();
    for (const item of items) {
      const platform = item.platform ?? "unknown";
      byPlatform.set(platform, [...(byPlatform.get(platform) ?? []), item]);
    }

    return Array.from(byPlatform, ([platform, platformItems]): LlmMention => {
      const hit = platformItems.find(
        (item) =>
          item.answer?.toLowerCase().includes(brand) ||
          item.sources?.some((s) => s.title?.toLowerCase().includes(brand))
      );

      const competitors = new Set<string>();
      for (const item of platformItems) {
        for (const entity of item.brand_entities ?? []) {
          if (entity.title && entity.title.toLowerCase() !== brand) competitors.add(entity.title);
        }
      }

      return {
        keyword,
        engine: PLATFORM_ENGINE[platform] ?? platform,
        brand_mentioned: Boolean(hit),
        mention_context: hit?.answer ? excerptAround(hit.answer, brandName) : undefined,
        competitors_mentioned: competitors.size ? Array.from(competitors) : undefined,
      };
    });
  });

  return perKeyword.flat();
}

interface LlmResponsesResult {
  items?: Array<{
    type?: string;
    sections?: Array<{
      text?: string | null;
      annotations?: Array<{ url?: string; title?: string }> | null;
    }>;
  }>;
}

async function getLlmResponses(
  client: DataForSeoClient,
  engine: "chatgpt" | "perplexity",
  queries: string[]
): Promise<LlmResponse[]> {
  if (queries.length === 0) return [];

  const endpoint =
    engine === "chatgpt"
      ? "ai_optimization/chat_gpt/llm_responses/live"
      : "ai_optimization/perplexity/llm_responses/live";

  return settleAll(queries.slice(0, 10), async (query): Promise<LlmResponse> => {
    const task =
      engine === "chatgpt"
        ? { user_prompt: query, model_name: CHATGPT_MODEL, web_search: true, web_search_country_iso_code: "US" }
        : { user_prompt: query, model_name: PERPLEXITY_MODEL, web_search_country_iso_code: "US" };

    const response = await client.request<LlmResponsesResult>("POST", endpoint, [task]);
    const result = client.extractFirstResult(response);
    const sections = (result?.items ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.sections ?? []);

    const text = sections
      .map((s) => s.text)
      .filter((t): t is string => Boolean(t))
      .join("\n");

    const seen = new Set<string>();
    const references: Array<{ url: string; title?: string }> = [];
    for (const annotation of sections.flatMap((s) => s.annotations ?? [])) {
      if (!annotation.url || seen.has(annotation.url)) continue;
      seen.add(annotation.url);
      references.push({ url: annotation.url, title: annotation.title });
    }

    return {
      query,
      engine,
      response_text: text || undefined,
      references,
      brand_mentioned: false, // Determined by caller
    };
  });
}

/**
 * Get ChatGPT (with web search) responses for queries to analyze AI visibility.
 */
export function getChatGptResponses(
  client: DataForSeoClient,
  queries: string[]
): Promise<LlmResponse[]> {
  return getLlmResponses(client, "chatgpt", queries);
}

/**
 * Get Perplexity (Sonar) responses for queries to analyze AI visibility.
 */
export function getPerplexityResponses(
  client: DataForSeoClient,
  queries: string[]
): Promise<LlmResponse[]> {
  return getLlmResponses(client, "perplexity", queries);
}

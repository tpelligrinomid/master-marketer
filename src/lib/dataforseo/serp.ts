import { DataForSeoClient } from "./client";
import { SerpResult } from "../../types/seo-audit-intelligence";

interface SerpItem {
  type?: string;
  rank_group?: number;
  url?: string;
  title?: string;
  domain?: string;
  description?: string;
  items?: Array<{
    title?: string;
    question?: string;
    expanded_element?: Array<{
      description?: string;
    }>;
  }>;
  // AI overview fields
  text?: string;
  markdown?: string;
  references?: Array<{
    url?: string;
    title?: string;
  }>;
}

interface SerpTaskResult {
  keyword?: string;
  search_volume?: number;
  items?: SerpItem[];
  item_types?: string[];
}

/**
 * Get SERP results for keywords.
 * Uses Promise.allSettled so individual keyword failures don't break the batch.
 */
export async function getSerpResults(
  client: DataForSeoClient,
  keywords: string[],
  locationCode: number = 2840,
  maxKeywords: number = 30,
  // Expanding People Also Ask is the slow part of a live SERP; quick lookups pass 0.
  peopleAlsoAskClickDepth: number = 2
): Promise<SerpResult[]> {
  const targetKeywords = keywords.slice(0, maxKeywords);

  const results = await Promise.allSettled(
    targetKeywords.map(async (keyword): Promise<SerpResult | null> => {
      const response = await client.request<SerpTaskResult>(
        "POST",
        "serp/google/organic/live/advanced",
        [
          {
            keyword,
            location_code: locationCode,
            language_code: "en",
            device: "desktop",
            os: "windows",
            depth: 20,
            load_async_ai_overview: true,
            ...(peopleAlsoAskClickDepth > 0 && { people_also_ask_click_depth: peopleAlsoAskClickDepth }),
          },
        ]
      );

      const result = client.extractFirstResult(response);
      if (!result) return null;

      return parseSerpItems(result.keyword || keyword, result.items || [], result.item_types || [], result.search_volume);
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<SerpResult | null> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((r): r is SerpResult => r !== null);
}

/**
 * Shape raw SERP items (live or historical) into a SerpResult.
 */
function parseSerpItems(
  keyword: string,
  items: SerpItem[],
  serpFeatures: string[],
  searchVolume?: number
): SerpResult {
  const organicResults = items
    .filter((item) => item.type === "organic")
    .map((item) => ({
      position: item.rank_group || 0,
      url: item.url || "",
      title: item.title || "",
      domain: item.domain || "",
    }));

  const snippetItem = items.find((item) => item.type === "featured_snippet");
  const featured_snippet = snippetItem
    ? {
        url: snippetItem.url || "",
        title: snippetItem.title || "",
        description: snippetItem.description || "",
      }
    : undefined;

  // DataForSEO puts the PAA question in `title`.
  const paaItem = items.find((item) => item.type === "people_also_ask");
  const people_also_ask = paaItem?.items?.map((q) => ({
    question: q.title || q.question || "",
    expanded_element: q.expanded_element?.[0]?.description,
  }));

  const aiItem = items.find(
    (item) => item.type === "ai_overview" || item.type === "google_ai_overview"
  );
  const ai_overview = aiItem
    ? {
        present: true,
        content: aiItem.markdown || aiItem.text || aiItem.description,
        references: aiItem.references?.map((ref) => ({
          url: ref.url || "",
          title: ref.title || "",
        })),
      }
    : serpFeatures.includes("ai_overview")
      ? { present: true }
      : undefined;

  return {
    keyword,
    search_volume: searchVolume,
    organic_results: organicResults,
    featured_snippet,
    people_also_ask,
    ai_overview,
    serp_features: serpFeatures,
  };
}

interface HistoricalSerpSnapshot {
  datetime?: string;
  item_types?: string[];
  items?: SerpItem[];
}

interface HistoricalSerpTaskResult {
  items?: HistoricalSerpSnapshot[];
}

/**
 * Most recent stored SERP for a keyword from DataForSEO Labs (monthly
 * snapshots). Returns in a second or two, unlike a live SERP; use it when
 * "as of the last snapshot" is good enough. Returns null if no snapshot exists.
 */
export async function getLatestHistoricalSerp(
  client: DataForSeoClient,
  keyword: string,
  locationCode: number = 2840
): Promise<(SerpResult & { snapshot_date?: string }) | null> {
  const response = await client.request<HistoricalSerpTaskResult>(
    "POST",
    "dataforseo_labs/google/historical_serps/live",
    [{ keyword, location_code: locationCode, language_code: "en" }]
  );

  // The client only checks the top-level status; a rejected task would
  // otherwise look the same as "no snapshot".
  const task = response.tasks?.[0];
  if (task && task.status_code !== 20000) {
    throw new Error(`DataForSEO task error (${task.status_code}): ${task.status_message}`);
  }

  const snapshots = client.extractFirstResult(response)?.items ?? [];
  const latest = snapshots
    .filter((snap) => snap.datetime)
    // "yyyy-mm-dd hh:mm:ss +00:00" isn't reliably Date.parse-able but sorts as text.
    .sort((a, b) => b.datetime!.localeCompare(a.datetime!))[0];
  if (!latest) return null;

  return {
    ...parseSerpItems(keyword, latest.items || [], latest.item_types || []),
    snapshot_date: latest.datetime!.slice(0, 10),
  };
}

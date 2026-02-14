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
    question?: string;
    expanded_element?: Array<{
      description?: string;
    }>;
  }>;
  // AI overview fields
  text?: string;
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
  maxKeywords: number = 30
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
            people_also_ask_click_depth: 2,
          },
        ]
      );

      const result = client.extractFirstResult(response);
      if (!result) return null;

      const items = result.items || [];
      const serpFeatures = result.item_types || [];

      // Extract organic results
      const organicResults = items
        .filter((item) => item.type === "organic")
        .map((item) => ({
          position: item.rank_group || 0,
          url: item.url || "",
          title: item.title || "",
          domain: item.domain || "",
        }));

      // Extract featured snippet
      const snippetItem = items.find((item) => item.type === "featured_snippet");
      const featured_snippet = snippetItem
        ? {
            url: snippetItem.url || "",
            title: snippetItem.title || "",
            description: snippetItem.description || "",
          }
        : undefined;

      // Extract People Also Ask
      const paaItem = items.find((item) => item.type === "people_also_ask");
      const people_also_ask = paaItem?.items?.map((q) => ({
        question: q.question || "",
        expanded_element: q.expanded_element?.[0]?.description,
      }));

      // Extract AI Overview
      const aiItem = items.find(
        (item) => item.type === "ai_overview" || item.type === "google_ai_overview"
      );
      const ai_overview = aiItem
        ? {
            present: true,
            content: aiItem.text || aiItem.description,
            references: aiItem.references?.map((ref) => ({
              url: ref.url || "",
              title: ref.title || "",
            })),
          }
        : serpFeatures.includes("ai_overview")
          ? { present: true }
          : undefined;

      return {
        keyword: result.keyword || keyword,
        search_volume: result.search_volume,
        organic_results: organicResults,
        featured_snippet,
        people_also_ask,
        ai_overview,
        serp_features: serpFeatures,
      };
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<SerpResult | null> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((r): r is SerpResult => r !== null);
}

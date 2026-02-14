import { DataForSeoClient } from "./client";
import { LlmMention, LlmResponse } from "../../types/seo-audit-intelligence";

interface LlmMentionRawItem {
  keyword?: string;
  se_type?: string;
  check_result?: boolean;
  brand_mentioned?: boolean;
  context?: string;
  competitors?: string[];
}

interface LlmMentionResult {
  items?: LlmMentionRawItem[];
}

/**
 * Check brand mentions across AI/LLM engines (ChatGPT, Perplexity, etc.)
 */
export async function getLlmMentions(
  client: DataForSeoClient,
  brandName: string,
  keywords: string[]
): Promise<LlmMention[]> {
  if (keywords.length === 0) return [];

  const tasks = keywords.slice(0, 20).map((keyword) => ({
    keyword,
    brand_name: brandName,
  }));

  const results = await Promise.allSettled(
    tasks.map(async (task): Promise<LlmMention> => {
      const response = await client.request<LlmMentionResult>(
        "POST",
        "serp/ai/overview/live/advanced",
        [
          {
            keyword: task.keyword,
            location_code: 2840,
            language_code: "en",
          },
        ]
      );

      const result = client.extractFirstResult(response);
      const items = result?.items || [];

      // Check if brand is mentioned in any AI overview content
      const brandMentioned = items.some(
        (item) =>
          item.context?.toLowerCase().includes(task.brand_name.toLowerCase()) ||
          item.brand_mentioned
      );

      return {
        keyword: task.keyword,
        engine: "google_ai_overview",
        brand_mentioned: brandMentioned,
        mention_context: items[0]?.context,
        competitors_mentioned: items[0]?.competitors,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<LlmMention> => r.status === "fulfilled")
    .map((r) => r.value);
}

interface ChatGptRawResult {
  items?: Array<{
    content?: string;
    references?: Array<{
      url?: string;
      title?: string;
    }>;
  }>;
}

/**
 * Get ChatGPT responses for queries to analyze AI visibility.
 */
export async function getChatGptResponses(
  client: DataForSeoClient,
  queries: string[]
): Promise<LlmResponse[]> {
  if (queries.length === 0) return [];

  const results = await Promise.allSettled(
    queries.slice(0, 10).map(async (query): Promise<LlmResponse> => {
      const response = await client.request<ChatGptRawResult>(
        "POST",
        "serp/chatgpt/live/advanced",
        [
          {
            keyword: query,
          },
        ]
      );

      const result = client.extractFirstResult(response);
      const item = result?.items?.[0];

      return {
        query,
        engine: "chatgpt",
        response_text: item?.content,
        references: item?.references?.map((ref) => ({
          url: ref.url || "",
          title: ref.title,
        })),
        brand_mentioned: false, // Will be determined by caller
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<LlmResponse> => r.status === "fulfilled")
    .map((r) => r.value);
}

/**
 * Get Perplexity responses for queries to analyze AI visibility.
 */
export async function getPerplexityResponses(
  client: DataForSeoClient,
  queries: string[]
): Promise<LlmResponse[]> {
  if (queries.length === 0) return [];

  const results = await Promise.allSettled(
    queries.slice(0, 10).map(async (query): Promise<LlmResponse> => {
      const response = await client.request<ChatGptRawResult>(
        "POST",
        "serp/perplexity/live/advanced",
        [
          {
            keyword: query,
          },
        ]
      );

      const result = client.extractFirstResult(response);
      const item = result?.items?.[0];

      return {
        query,
        engine: "perplexity",
        response_text: item?.content,
        references: item?.references?.map((ref) => ({
          url: ref.url || "",
          title: ref.title,
        })),
        brand_mentioned: false,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<LlmResponse> => r.status === "fulfilled")
    .map((r) => r.value);
}

import { z } from "zod";

const ISO_COUNTRY_REGEX = /^[A-Za-z]{2}$/;

export const SeoEnrichKeywordRequestSchema = z.object({
  target_keyword: z.string().trim().min(1).max(200),
  secondary_keywords: z.array(z.string().trim().min(1)).max(10).optional(),
  country: z
    .string()
    .regex(ISO_COUNTRY_REGEX, "country must be ISO 3166-1 alpha-2")
    .transform((v) => v.toLowerCase())
    .default("us"),
  client_brand: z.string().trim().min(1).optional(),
  client_domain: z.string().trim().min(1).optional(),
  competitor_domains: z.array(z.string().trim().min(1)).max(3).optional(),
});

export type SeoEnrichKeywordRequest = z.infer<typeof SeoEnrichKeywordRequestSchema>;

export interface SeoEnrichKeywordResponse {
  target_keyword: string;
  country: string;
  fetched_at: string;
  keyword_data: {
    volume: number;
    difficulty?: number;
    cpc_usd?: number;
    search_intent: {
      main: string | null;
      secondary: string | null;
      probability: number | null;
    };
    parent_topic?: string;
    traffic_potential?: number;
  };
  serp: {
    top_organic: Array<{
      position: number;
      url: string;
      title: string;
      domain: string;
    }>;
    ai_overview: {
      present: boolean;
      content?: string;
      references?: Array<{ url: string; title: string }>;
    } | null;
    people_also_ask: Array<{
      question: string;
      expanded_answer?: string;
    }>;
    featured_snippet: {
      url: string;
      title: string;
      description: string;
    } | null;
    serp_features: string[];
  };
  related_keywords: Array<{
    keyword: string;
    volume: number;
    difficulty?: number;
    intent?: string;
  }>;
  content_gap?: Array<{
    keyword: string;
    competitor_position: number;
    client_position: number | null;
    search_volume: number;
  }>;
  aeo?: {
    llm_mentions_count: number;
    appears_in_chatgpt_responses: boolean;
    appears_in_perplexity_responses: boolean;
    competing_brands_in_llm_responses: string[];
  };
  ranking_status?: {
    client_currently_ranks: boolean;
    client_position?: number;
    client_url?: string;
  };
  errors: string[];
}

export type SeoEnrichKeywordErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "KEYWORD_NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "TIMEOUT";

export interface SeoEnrichKeywordErrorResponse {
  error_code: SeoEnrichKeywordErrorCode;
  message: string;
}

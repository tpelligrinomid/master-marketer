import { DataForSeoClient } from "./client";
import {
  RankedKeyword,
  ContentGapKeyword,
  CompetitorDomain,
  SearchIntentResult,
  KeywordOverview,
  RelatedKeyword,
} from "../../types/seo-audit-intelligence";

interface RankedKeywordRawItem {
  keyword_data?: {
    keyword?: string;
    keyword_info?: {
      search_volume?: number;
      cpc?: number;
      competition_level?: string;
    };
    serp_info?: {
      serp_item?: {
        rank_group?: number;
        url?: string;
      };
      se_results_count?: number;
    };
    keyword_properties?: {
      keyword_difficulty?: number;
    };
    search_intent_info?: {
      main_intent?: string;
    };
    impressions_info?: {
      daily_impressions_average?: number;
    };
  };
  ranked_serp_element?: {
    serp_item?: {
      rank_group?: number;
      url?: string;
      se_type?: string;
    };
  };
}

interface RankedKeywordsResult {
  total_count?: number;
  items?: RankedKeywordRawItem[];
}

/**
 * Get ranked keywords for a domain from DataForSEO Labs.
 */
export async function getRankedKeywords(
  client: DataForSeoClient,
  domain: string,
  locationCode: number = 2840,
  limit: number = 500
): Promise<RankedKeyword[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const response = await client.request<RankedKeywordsResult>(
    "POST",
    "dataforseo_labs/google/ranked_keywords/live",
    [
      {
        target: cleanDomain,
        location_code: locationCode,
        language_code: "en",
        limit,
        order_by: ["ranked_serp_element.serp_item.rank_group,asc"],
        include_serp_info: true,
        include_clickstream_data: false,
      },
    ]
  );

  const result = client.extractFirstResult(response);
  return (result?.items || []).map((item) => {
    const kd = item.keyword_data;
    const serpItem = item.ranked_serp_element?.serp_item || kd?.serp_info?.serp_item;

    return {
      keyword: kd?.keyword || "",
      position: serpItem?.rank_group || 0,
      search_volume: kd?.keyword_info?.search_volume || 0,
      keyword_difficulty: kd?.keyword_properties?.keyword_difficulty,
      cpc: kd?.keyword_info?.cpc,
      url: serpItem?.url,
      intent: kd?.search_intent_info?.main_intent,
      traffic_share: kd?.impressions_info?.daily_impressions_average,
    };
  });
}

interface IntersectionRawItem {
  keyword?: string;
  keyword_data?: {
    keyword_info?: {
      search_volume?: number;
      cpc?: number;
    };
    keyword_properties?: {
      keyword_difficulty?: number;
    };
    search_intent_info?: {
      main_intent?: string;
    };
  };
  intersection_result?: Record<
    string,
    Array<{
      rank_group?: number;
    }>
  >;
}

interface IntersectionResult {
  total_count?: number;
  items?: IntersectionRawItem[];
}

/**
 * Get content gap keywords (keywords a competitor ranks for but client doesn't).
 */
export async function getDomainIntersection(
  client: DataForSeoClient,
  clientDomain: string,
  competitorDomain: string,
  locationCode: number = 2840,
  limit: number = 200
): Promise<ContentGapKeyword[]> {
  const cleanClient = clientDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cleanCompetitor = competitorDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const response = await client.request<IntersectionResult>(
    "POST",
    "dataforseo_labs/google/domain_intersection/live",
    [
      {
        target1: cleanCompetitor,
        target2: cleanClient,
        location_code: locationCode,
        language_code: "en",
        limit,
        intersections: false, // Get keywords competitor has but client doesn't
        order_by: ["keyword_data.keyword_info.search_volume,desc"],
      },
    ]
  );

  const result = client.extractFirstResult(response);
  return (result?.items || []).map((item) => {
    const kd = item.keyword_data;
    const positions: Record<string, number> = {};

    if (item.intersection_result) {
      for (const [domain, rankings] of Object.entries(item.intersection_result)) {
        if (rankings?.[0]?.rank_group) {
          positions[domain] = rankings[0].rank_group;
        }
      }
    }

    return {
      keyword: item.keyword || "",
      search_volume: kd?.keyword_info?.search_volume || 0,
      keyword_difficulty: kd?.keyword_properties?.keyword_difficulty,
      intent: kd?.search_intent_info?.main_intent,
      competitor_positions: positions,
      client_position: null,
    };
  });
}

interface CompetitorDomainRawItem {
  domain?: string;
  avg_position?: number;
  sum_position?: number;
  intersections?: number;
  full_domain_metrics?: Array<{
    organic?: {
      count?: number;
    };
  }>;
}

interface CompetitorDomainsResult {
  total_count?: number;
  items?: CompetitorDomainRawItem[];
}

/**
 * Get SERP competitor domains for a target domain.
 */
export async function getCompetitorDomains(
  client: DataForSeoClient,
  domain: string,
  locationCode: number = 2840
): Promise<CompetitorDomain[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const response = await client.request<CompetitorDomainsResult>(
    "POST",
    "dataforseo_labs/google/competitors_domain/live",
    [
      {
        target: cleanDomain,
        location_code: locationCode,
        language_code: "en",
        limit: 20,
      },
    ]
  );

  const result = client.extractFirstResult(response);
  return (result?.items || []).map((item) => ({
    domain: item.domain || "",
    common_keywords: item.intersections || 0,
    competitor_keywords: item.full_domain_metrics?.[0]?.organic?.count || 0,
    avg_position: item.avg_position,
    intersection_score: item.intersections,
  }));
}

interface SearchIntentRawItem {
  keyword?: string;
  keyword_intent?: {
    label?: string;
    probability?: number;
  };
  secondary_keyword_intent?: {
    label?: string;
    probability?: number;
  };
}

interface SearchIntentApiResult {
  items?: SearchIntentRawItem[];
}

/**
 * Get search intent classification for keywords.
 */
export async function getSearchIntent(
  client: DataForSeoClient,
  keywords: string[],
  locationCode: number = 2840
): Promise<SearchIntentResult[]> {
  if (keywords.length === 0) return [];

  const response = await client.request<SearchIntentApiResult>(
    "POST",
    "dataforseo_labs/google/search_intent/live",
    [
      {
        keywords: keywords.slice(0, 100), // API limit
        location_code: locationCode,
        language_code: "en",
      },
    ]
  );

  const result = client.extractFirstResult(response);
  return (result?.items || []).map((item) => ({
    keyword: item.keyword || "",
    intent: item.keyword_intent?.label || "unknown",
    secondary_intent: item.secondary_keyword_intent?.label,
  }));
}

interface KeywordOverviewRawItem {
  keyword?: string;
  keyword_info?: {
    search_volume?: number;
    cpc?: number;
    competition_level?: string;
  };
  keyword_properties?: {
    keyword_difficulty?: number;
  };
  search_intent_info?: {
    main_intent?: string;
    foreign_intent?: string[];
  };
  clickstream_keyword_info?: {
    search_volume?: number;
  };
}

interface KeywordOverviewResult {
  items?: KeywordOverviewRawItem[];
}

/**
 * Get keyword overview (volume, difficulty, CPC, intent) for a single keyword.
 * Wraps `dataforseo_labs/google/keyword_overview/live`.
 */
export async function getKeywordOverview(
  client: DataForSeoClient,
  keyword: string,
  locationCode: number = 2840
): Promise<KeywordOverview | null> {
  const response = await client.request<KeywordOverviewResult>(
    "POST",
    "dataforseo_labs/google/keyword_overview/live",
    [
      {
        keywords: [keyword],
        location_code: locationCode,
        language_code: "en",
        include_serp_info: false,
        include_clickstream_data: true,
      },
    ]
  );

  const result = client.extractFirstResult(response);
  const item = result?.items?.[0];
  if (!item) return null;

  const mainIntent = item.search_intent_info?.main_intent;
  const foreignIntents = item.search_intent_info?.foreign_intent;

  return {
    keyword: item.keyword || keyword,
    search_volume: item.keyword_info?.search_volume ?? 0,
    keyword_difficulty: item.keyword_properties?.keyword_difficulty,
    cpc: item.keyword_info?.cpc,
    competition_level: item.keyword_info?.competition_level,
    main_intent: mainIntent,
    secondary_intent: foreignIntents && foreignIntents.length > 0 ? foreignIntents[0] : undefined,
    clickstream_search_volume: item.clickstream_keyword_info?.search_volume,
  };
}

interface RelatedKeywordRawItem {
  keyword_data?: {
    keyword?: string;
    keyword_info?: {
      search_volume?: number;
      cpc?: number;
    };
    keyword_properties?: {
      keyword_difficulty?: number;
    };
    search_intent_info?: {
      main_intent?: string;
    };
  };
  depth?: number;
  related_keywords?: string[];
}

interface RelatedKeywordsResult {
  items?: RelatedKeywordRawItem[];
}

/**
 * Get related keywords for a seed keyword.
 * Wraps `dataforseo_labs/google/related_keywords/live`.
 */
export async function getRelatedKeywords(
  client: DataForSeoClient,
  keyword: string,
  locationCode: number = 2840,
  limit: number = 30
): Promise<RelatedKeyword[]> {
  const response = await client.request<RelatedKeywordsResult>(
    "POST",
    "dataforseo_labs/google/related_keywords/live",
    [
      {
        keyword,
        location_code: locationCode,
        language_code: "en",
        limit,
        depth: 1,
        include_seed_keyword: false,
      },
    ]
  );

  const result = client.extractFirstResult(response);
  const out: RelatedKeyword[] = [];
  for (const item of result?.items || []) {
    const kd = item.keyword_data;
    if (!kd?.keyword) continue;
    out.push({
      keyword: kd.keyword,
      search_volume: kd.keyword_info?.search_volume ?? 0,
      keyword_difficulty: kd.keyword_properties?.keyword_difficulty,
      cpc: kd.keyword_info?.cpc,
      intent: kd.search_intent_info?.main_intent,
    });
  }
  return out;
}

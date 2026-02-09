import {
  MozDomainMetrics,
  MozKeyword,
  MozTopPage,
} from "../types/research-intelligence";

const MOZ_API_BASE = "https://lsapi.seomoz.com/v2";

interface MozRequestOptions {
  apiKey: string;
  endpoint: string;
  body: Record<string, unknown>;
}

async function mozRequest<T>(options: MozRequestOptions): Promise<T> {
  const response = await fetch(`${MOZ_API_BASE}/${options.endpoint}`, {
    method: "POST",
    headers: {
      "x-moz-token": options.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Moz API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get domain-level authority metrics from Moz.
 */
export async function getDomainMetrics(
  domain: string,
  apiKey: string
): Promise<MozDomainMetrics> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  interface MozDomainResponse {
    domain_authority?: number;
    page_authority?: number;
    spam_score?: number;
    external_pages_to_domain?: number;
    external_pages_to_root_domain?: number;
  }

  const data = await mozRequest<MozDomainResponse>({
    apiKey,
    endpoint: "url_metrics",
    body: {
      targets: [cleanDomain],
      daily_history_values: false,
    },
  });

  return {
    domain: cleanDomain,
    domain_authority: data.domain_authority,
    page_authority: data.page_authority,
    spam_score: data.spam_score,
    external_links: data.external_pages_to_domain,
    linking_domains: data.external_pages_to_root_domain,
  };
}

/**
 * Get top keyword rankings for a domain from Moz.
 */
export async function getKeywordRankings(
  domain: string,
  apiKey: string,
  limit: number = 50
): Promise<MozKeyword[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  interface MozKeywordResult {
    keyword?: string;
    ranking_position?: number;
    search_volume?: number;
    difficulty?: number;
  }

  interface MozKeywordsResponse {
    keyword_rankings?: MozKeywordResult[];
    results?: MozKeywordResult[];
  }

  const data = await mozRequest<MozKeywordsResponse>({
    apiKey,
    endpoint: "keyword_rankings",
    body: {
      target: cleanDomain,
      scope: "domain",
      limit,
    },
  });

  const results = data.keyword_rankings || data.results || [];
  return results.map((r) => ({
    keyword: r.keyword || "",
    ranking_position: r.ranking_position,
    search_volume: r.search_volume,
    difficulty: r.difficulty,
  }));
}

/**
 * Get top pages by authority for a domain from Moz.
 */
export async function getTopPages(
  domain: string,
  apiKey: string,
  limit: number = 50
): Promise<MozTopPage[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  interface MozTopPageResult {
    page?: string;
    url?: string;
    page_authority?: number;
    external_pages_to_page?: number;
    title?: string;
  }

  interface MozTopPagesResponse {
    results?: MozTopPageResult[];
    top_pages?: MozTopPageResult[];
  }

  const data = await mozRequest<MozTopPagesResponse>({
    apiKey,
    endpoint: "top_pages",
    body: {
      target: cleanDomain,
      scope: "domain",
      limit,
    },
  });

  const results = data.results || data.top_pages || [];
  return results.map((r) => ({
    url: r.page || r.url || "",
    page_authority: r.page_authority,
    external_links: r.external_pages_to_page,
    title: r.title,
  }));
}

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
      Authorization: `Bearer ${options.apiKey}`,
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

function extractRootDomain(domain: string): string {
  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

/**
 * Get domain-level authority metrics from Moz.
 */
export async function getDomainMetrics(
  domain: string,
  apiKey: string
): Promise<MozDomainMetrics> {
  const rootDomain = extractRootDomain(domain);

  interface MozMetricResult {
    domain_authority?: number;
    page_authority?: number;
    spam_score?: number;
    root_domains_to_root_domain?: number;
    pages_to_root_domain?: number;
    external_pages_to_root_domain?: number;
  }

  interface MozUrlMetricsResponse {
    results?: MozMetricResult[];
  }

  const data = await mozRequest<MozUrlMetricsResponse>({
    apiKey,
    endpoint: "url_metrics",
    body: {
      targets: [rootDomain],
    },
  });

  const result = data.results?.[0];
  if (!result) {
    return { domain: rootDomain };
  }

  return {
    domain: rootDomain,
    domain_authority: result.domain_authority ? Math.round(result.domain_authority) : undefined,
    page_authority: result.page_authority ? Math.round(result.page_authority) : undefined,
    spam_score: result.spam_score ? Math.round(result.spam_score * 100) : undefined,
    external_links: result.pages_to_root_domain || result.external_pages_to_root_domain,
    linking_domains: result.root_domains_to_root_domain,
  };
}

/**
 * Get top pages by authority for a domain from Moz.
 */
export async function getTopPages(
  domain: string,
  apiKey: string,
  limit: number = 50
): Promise<MozTopPage[]> {
  const rootDomain = extractRootDomain(domain);

  interface MozTopPageResult {
    page?: string;
    url?: string;
    title?: string;
    page_authority?: number;
    root_domains_to_page?: number;
  }

  interface MozTopPagesResponse {
    results?: MozTopPageResult[];
  }

  const data = await mozRequest<MozTopPagesResponse>({
    apiKey,
    endpoint: "top_pages",
    body: {
      target: rootDomain,
      scope: "root_domain",
      limit,
      sort: "page_authority",
    },
  });

  return (data.results || []).map((r) => ({
    url: r.page || r.url || "",
    page_authority: r.page_authority ? Math.round(r.page_authority) : undefined,
    external_links: r.root_domains_to_page,
    title: r.title,
  }));
}

/**
 * Get keyword rankings for a domain from Moz.
 * Note: This uses the anchor_text endpoint as a proxy for keyword visibility,
 * since the Moz Links API doesn't have a dedicated keyword rankings endpoint.
 */
export async function getKeywordRankings(
  domain: string,
  apiKey: string,
  limit: number = 50
): Promise<MozKeyword[]> {
  const rootDomain = extractRootDomain(domain);

  interface MozAnchorResult {
    anchor_text?: string;
    external_pages?: number;
    external_root_domains?: number;
  }

  interface MozAnchorResponse {
    results?: MozAnchorResult[];
  }

  const data = await mozRequest<MozAnchorResponse>({
    apiKey,
    endpoint: "anchor_text",
    body: {
      target: rootDomain,
      scope: "root_domain",
      limit,
      sort: "external_root_domains",
    },
  });

  return (data.results || []).map((r) => ({
    keyword: r.anchor_text || "",
    search_volume: r.external_pages,
    difficulty: r.external_root_domains,
  }));
}

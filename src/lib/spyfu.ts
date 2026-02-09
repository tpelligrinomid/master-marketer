import {
  SpyFuPPCKeyword,
  SpyFuAdHistory,
} from "../types/research-intelligence";

const SPYFU_API_BASE = "https://www.spyfu.com/apis/v2";

interface SpyFuRequestOptions {
  apiKey: string;
  endpoint: string;
  params: Record<string, string>;
  proxyUrl?: string;
}

async function spyfuRequest<T>(options: SpyFuRequestOptions): Promise<T> {
  const url = new URL(`${SPYFU_API_BASE}/${options.endpoint}`);
  url.searchParams.set("api_key", options.apiKey);
  for (const [key, value] of Object.entries(options.params)) {
    url.searchParams.set(key, value);
  }

  const fetchUrl = options.proxyUrl
    ? `${options.proxyUrl}?${new URLSearchParams({ url: url.toString() })}`
    : url.toString();

  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get top PPC keywords for a domain from SpyFu.
 */
export async function getPPCKeywords(
  domain: string,
  apiKey: string,
  proxyUrl?: string,
  limit: number = 50
): Promise<SpyFuPPCKeyword[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  interface SpyFuPPCResult {
    keyword?: string;
    position?: number;
    costPerClick?: number;
    monthlyClicks?: number;
    monthlyCost?: number;
    adCount?: number;
  }

  interface SpyFuPPCResponse {
    results?: SpyFuPPCResult[];
  }

  const data = await spyfuRequest<SpyFuPPCResponse>({
    apiKey,
    endpoint: "domain/ppc_keywords",
    params: {
      domain: cleanDomain,
      country: "US",
      limit: String(limit),
      sort_by: "monthly_cost",
      sort_order: "desc",
    },
    proxyUrl,
  });

  return (data.results || []).map((r) => ({
    keyword: r.keyword || "",
    position: r.position,
    cost_per_click: r.costPerClick,
    monthly_clicks: r.monthlyClicks,
    monthly_cost: r.monthlyCost,
    ad_count: r.adCount,
  }));
}

/**
 * Get domain ad history (text ad copy) from SpyFu.
 */
export async function getAdHistory(
  domain: string,
  apiKey: string,
  proxyUrl?: string,
  limit: number = 50
): Promise<SpyFuAdHistory[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  interface SpyFuAdHistoryResult {
    keyword?: string;
    headline?: string;
    description?: string;
    displayUrl?: string;
    landingPage?: string;
    firstSeen?: string;
    lastSeen?: string;
    position?: number;
  }

  interface SpyFuAdHistoryResponse {
    results?: SpyFuAdHistoryResult[];
  }

  const data = await spyfuRequest<SpyFuAdHistoryResponse>({
    apiKey,
    endpoint: "domain/ad_history",
    params: {
      domain: cleanDomain,
      country: "US",
      limit: String(limit),
    },
    proxyUrl,
  });

  return (data.results || []).map((r) => ({
    keyword: r.keyword,
    headline: r.headline,
    description: r.description,
    display_url: r.displayUrl,
    landing_page: r.landingPage,
    first_seen: r.firstSeen,
    last_seen: r.lastSeen,
    ad_position: r.position,
  }));
}

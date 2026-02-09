import {
  SpyFuPPCKeyword,
  SpyFuAdHistory,
} from "../types/research-intelligence";

const SPYFU_API_BASE = "https://api.spyfu.com/apis";

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

  // Try direct first, fall back to proxy if direct fails
  const directUrl = url.toString();

  try {
    const directResponse = await fetch(directUrl);
    if (directResponse.ok) {
      return directResponse.json() as Promise<T>;
    }
    // If direct fails and we have a proxy, try proxy
    if (!options.proxyUrl) {
      const text = await directResponse.text();
      throw new Error(`SpyFu API error (${directResponse.status}): ${text.slice(0, 200)}`);
    }
  } catch (err) {
    if (!options.proxyUrl) throw err;
    console.warn(`SpyFu direct request failed, trying proxy: ${err instanceof Error ? err.message : err}`);
  }

  // Proxy fallback
  const headers: Record<string, string> = {};
  const proxyParsed = new URL(options.proxyUrl!);
  if (proxyParsed.username) {
    headers["Authorization"] =
      `Basic ${Buffer.from(`${decodeURIComponent(proxyParsed.username)}:${decodeURIComponent(proxyParsed.password)}`).toString("base64")}`;
    proxyParsed.username = "";
    proxyParsed.password = "";
  }
  const proxyFetchUrl = `${proxyParsed.toString()}?${new URLSearchParams({ url: directUrl })}`;

  const response = await fetch(proxyFetchUrl, { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu API error via proxy (${response.status}): ${text.slice(0, 200)}`);
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
    term?: string;
    keyword?: string;
    rankPaid?: number;
    position?: number;
    costPerClick?: number;
    ppcClicks?: number;
    monthlyClicks?: number;
    ppcCost?: number;
    monthlyCost?: number;
    adCount?: number;
  }

  interface SpyFuPPCResponse {
    results?: SpyFuPPCResult[];
    resultCount?: number;
  }

  const data = await spyfuRequest<SpyFuPPCResponse>({
    apiKey,
    endpoint: "serp_api/v2/ppc/getPaidSerps",
    params: {
      query: cleanDomain,
      countryCode: "US",
      pageSize: String(limit),
      startingRow: "1",
      sortBy: "SearchVolume",
      sortOrder: "Descending",
    },
    proxyUrl,
  });

  return (data.results || []).map((r) => ({
    keyword: r.term || r.keyword || "",
    position: r.rankPaid || r.position,
    cost_per_click: r.costPerClick,
    monthly_clicks: r.ppcClicks || r.monthlyClicks,
    monthly_cost: r.ppcCost || r.monthlyCost,
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
    term?: string;
    keyword?: string;
    adTitle?: string;
    headline?: string;
    adDescription?: string;
    description?: string;
    displayUrl?: string;
    landingPage?: string;
    destUrl?: string;
    firstSeen?: string;
    lastSeen?: string;
    position?: number;
  }

  interface SpyFuAdHistoryResponse {
    results?: SpyFuAdHistoryResult[];
    resultCount?: number;
  }

  const data = await spyfuRequest<SpyFuAdHistoryResponse>({
    apiKey,
    endpoint: "cloud_ad_history_api/v2/domain/getDomainAdHistory",
    params: {
      domain: cleanDomain,
      countryCode: "US",
      pageSize: String(limit),
      startingRow: "1",
    },
    proxyUrl,
  });

  return (data.results || []).map((r) => ({
    keyword: r.term || r.keyword,
    headline: r.adTitle || r.headline,
    description: r.adDescription || r.description,
    display_url: r.displayUrl,
    landing_page: r.landingPage || r.destUrl,
    first_seen: r.firstSeen,
    last_seen: r.lastSeen,
    ad_position: r.position,
  }));
}

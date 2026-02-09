import {
  SpyFuPPCKeyword,
  SpyFuAdHistory,
} from "../types/research-intelligence";
import { ProxyAgent } from "undici";

const SPYFU_API_BASE = "https://www.spyfu.com/apis";

interface SpyFuRequestOptions {
  apiId: string;
  apiKey: string;
  endpoint: string;
  params: Record<string, string>;
  proxyUrl?: string;
}

async function spyfuRequest<T>(options: SpyFuRequestOptions): Promise<T> {
  const url = new URL(`${SPYFU_API_BASE}/${options.endpoint}`);
  for (const [key, value] of Object.entries(options.params)) {
    url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${options.apiId}:${options.apiKey}`).toString("base64")}`,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchOptions: any = { headers };

  if (options.proxyUrl) {
    fetchOptions.dispatcher = new ProxyAgent(options.proxyUrl);
  }

  const response = await fetch(url.toString(), fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu API error (${response.status}): ${text.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get top PPC keywords for a domain from SpyFu.
 * Matches working n8n config: keyword_api/v2/ppc/getMostSuccessful
 */
export async function getPPCKeywords(
  domain: string,
  apiId: string,
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
    apiId,
    apiKey,
    endpoint: "keyword_api/v2/ppc/getMostSuccessful",
    params: {
      query: cleanDomain,
      country: "US",
      pageSize: String(limit),
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
  apiId: string,
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
    apiId,
    apiKey,
    endpoint: "cloud_ad_history_api/v2/domain/getDomainAdHistory",
    params: {
      domain: cleanDomain,
      country: "US",
      pageSize: String(limit),
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

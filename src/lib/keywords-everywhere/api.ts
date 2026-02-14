import { KeywordsEverywhereClient } from "./client";
import {
  KeKeywordData,
  KeRelatedKeyword,
  KePasfKeyword,
  KeDomainTraffic,
} from "../../types/seo-audit-intelligence";

// ─────────────────────────────────────────────
// KE API response shapes (internal)
// ─────────────────────────────────────────────

interface KeKeywordMetricsResponse {
  data: Array<{
    keyword: string;
    vol: number;
    cpc: { currency: string; value: string };
    competition: number;
    trend: Array<{ month: string; year: number; value: number }>;
  }>;
  credits: number;
  time: number;
}

interface KeRelatedResponse {
  data: Array<{
    keyword: string;
    vol: number;
    cpc: { currency: string; value: string };
    competition: number;
    trend: Array<{ month: string; year: number; value: number }>;
  }>;
  credits: number;
  time: number;
}

interface KePasfResponse {
  data: Array<{
    keyword: string;
    vol: number;
    cpc: { currency: string; value: string };
    competition: number;
    trend: Array<{ month: string; year: number; value: number }>;
  }>;
  credits: number;
  time: number;
}

interface KeDomainKeywordsResponse {
  data: Array<{
    keyword: string;
    vol: number;
    cpc: { currency: string; value: string };
    competition: number;
    estimated_monthly_traffic: number;
    serp_position: number;
  }>;
  credits_consumed: number;
  time_taken: number;
}

// ─────────────────────────────────────────────
// Public API functions
// ─────────────────────────────────────────────

/**
 * Get keyword metrics (volume, CPC, competition, 12-month trend) for up to 100 keywords.
 */
export async function getKeywordMetrics(
  client: KeywordsEverywhereClient,
  keywords: string[],
  country: string = "us"
): Promise<KeKeywordData[]> {
  const params = new URLSearchParams();
  params.append("country", country);
  params.append("currency", "USD");
  for (const kw of keywords.slice(0, 100)) {
    params.append("kw[]", kw);
  }

  const response = await client.post<KeKeywordMetricsResponse>(
    "get_keyword_data",
    params
  );

  return (response.data || []).map((item) => ({
    keyword: item.keyword,
    search_volume: item.vol,
    cpc: parseFloat(item.cpc?.value) || 0,
    competition: item.competition,
    trend: (item.trend || []).map((t) => ({
      month: t.month,
      year: t.year,
      value: t.value,
    })),
  }));
}

/**
 * Get related keywords for a seed keyword (semantic expansion).
 */
export async function getRelatedKeywords(
  client: KeywordsEverywhereClient,
  keyword: string,
  country: string = "us"
): Promise<KeRelatedKeyword[]> {
  const response = await client.postJson<KeRelatedResponse>(
    "get_related_keywords",
    { keyword, country, currency: "USD", num: 50 }
  );

  return (response.data || [])
    .filter((item) => item?.keyword)
    .map((item) => ({
      keyword: item.keyword,
      search_volume: item.vol ?? 0,
      cpc: parseFloat(item.cpc?.value) || 0,
      competition: item.competition ?? 0,
    }));
}

/**
 * Get "People Also Search For" keywords for a seed keyword.
 */
export async function getPasfKeywords(
  client: KeywordsEverywhereClient,
  keyword: string,
  country: string = "us"
): Promise<KePasfKeyword[]> {
  const response = await client.postJson<KePasfResponse>(
    "get_pasf_keywords",
    { keyword, country, currency: "USD", num: 50 }
  );

  return (response.data || [])
    .filter((item) => item?.keyword)
    .map((item) => ({
      keyword: item.keyword,
      search_volume: item.vol ?? 0,
      cpc: parseFloat(item.cpc?.value) || 0,
      competition: item.competition ?? 0,
    }));
}

/**
 * Get domain traffic estimate for a single domain using get_domain_keywords.
 * Aggregates per-keyword traffic data into a domain-level summary.
 * (get_domain_traffic is Gold+ only; get_domain_keywords works on Silver)
 */
async function getDomainTrafficSingle(
  client: KeywordsEverywhereClient,
  domain: string,
  country: string = "us"
): Promise<KeDomainTraffic | null> {
  const response = await client.postJson<KeDomainKeywordsResponse>(
    "get_domain_keywords",
    { domain, country, currency: "USD", num: 500 }
  );

  const keywords = response.data;
  if (!keywords || keywords.length === 0) return null;

  let totalTraffic = 0;
  let totalTrafficCost = 0;
  for (const kw of keywords) {
    const traffic = kw.estimated_monthly_traffic ?? 0;
    const cpc = parseFloat(kw.cpc?.value) || 0;
    totalTraffic += traffic;
    totalTrafficCost += traffic * cpc;
  }

  console.log(`[KE] Domain keywords for ${domain}: ${keywords.length} keywords, ~${totalTraffic.toLocaleString()} monthly traffic`);

  return {
    domain,
    estimated_monthly_traffic: totalTraffic,
    organic_keywords: keywords.length,
    organic_traffic_cost: Math.round(totalTrafficCost),
  };
}

/**
 * Get domain traffic estimates for multiple domains (calls API per-domain in parallel).
 */
export async function getDomainTraffic(
  client: KeywordsEverywhereClient,
  domains: string[],
  country: string = "us"
): Promise<KeDomainTraffic[]> {
  const results = await Promise.allSettled(
    domains.slice(0, 10).map((d) => getDomainTrafficSingle(client, d, country))
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      console.warn(`[KE] Domain traffic failed for ${domains[i]}: ${r.reason}`);
    } else if (r.value === null) {
      console.warn(`[KE] Domain traffic returned no data for ${domains[i]}`);
    }
  }

  return results
    .filter(
      (r): r is PromiseFulfilledResult<KeDomainTraffic | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value!);
}

import { Request, Response } from "express";
import { z, ZodTypeAny } from "zod";
import { getEnv } from "../../config/env";
import { DataForSeoClient } from "../../lib/dataforseo/client";
import { getRelatedKeywords } from "../../lib/dataforseo/labs";
import { getBacklinkSummary } from "../../lib/dataforseo/backlinks";

/**
 * Quick SEO research endpoints for chat tools (Compass).
 *
 * Each one is a single DataForSEO call that answers in a few seconds and
 * returns a compact, pre-sorted list, unlike the multi-minute audit jobs.
 * All take an optional location_code (DataForSEO location, default 2840 = US).
 */

const ENDPOINT_TIMEOUT_MS = 25_000;

const domain = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .transform((v) =>
    v
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/.*$/, "")
      .toLowerCase()
  );
const locationCode = z.number().int().positive().default(2840);

function cleanUrl(url: string | undefined): string | undefined {
  return url?.replace(/^https?:\/\/(www\.)?/i, "");
}

function round(n: number | undefined, digits = 2): number | undefined {
  return n === undefined || n === null ? undefined : Math.round(n * 10 ** digits) / 10 ** digits;
}

// ============================================================================
// DataForSEO Labs item shape (ranked_keywords and domain_intersection share it)
// ============================================================================

interface LabsKeywordData {
  keyword?: string;
  keyword_info?: { search_volume?: number; cpc?: number };
  keyword_properties?: { keyword_difficulty?: number };
  search_intent_info?: { main_intent?: string };
}

interface LabsSerpElement {
  url?: string;
  rank_group?: number;
  etv?: number;
  type?: string;
}

function keywordFields(kd: LabsKeywordData | undefined) {
  return {
    keyword: kd?.keyword ?? "",
    search_volume: kd?.keyword_info?.search_volume ?? 0,
    keyword_difficulty: kd?.keyword_properties?.keyword_difficulty,
    cpc_usd: round(kd?.keyword_info?.cpc),
    intent: kd?.search_intent_info?.main_intent,
  };
}

// ============================================================================
// Handlers
// ============================================================================

const RankedKeywordsSchema = z.object({
  domain,
  location_code: locationCode,
  limit: z.number().int().min(1).max(100).default(50),
  max_position: z.number().int().min(1).max(100).default(20),
  min_search_volume: z.number().int().min(0).default(10),
});

/** What a domain ranks for, by estimated traffic. */
async function rankedKeywords(client: DataForSeoClient, req: z.infer<typeof RankedKeywordsSchema>) {
  const response = await client.request<{
    total_count?: number;
    metrics?: { organic?: { count?: number; etv?: number } };
    items?: Array<{ keyword_data?: LabsKeywordData; ranked_serp_element?: { serp_item?: LabsSerpElement } }>;
  }>("POST", "dataforseo_labs/google/ranked_keywords/live", [
    {
      target: req.domain,
      location_code: req.location_code,
      language_code: "en",
      limit: req.limit,
      item_types: ["organic"],
      filters: [
        ["ranked_serp_element.serp_item.rank_group", "<=", req.max_position],
        "and",
        ["keyword_data.keyword_info.search_volume", ">=", req.min_search_volume],
      ],
      order_by: ["ranked_serp_element.serp_item.etv,desc"],
    },
  ]);
  const result = client.extractFirstResult(response);
  return {
    domain: req.domain,
    total_organic_keywords: result?.metrics?.organic?.count ?? null,
    estimated_monthly_organic_traffic: round(result?.metrics?.organic?.etv, 0) ?? null,
    matching_keywords: result?.total_count ?? 0,
    keywords: (result?.items ?? []).map((item) => {
      const serp = item.ranked_serp_element?.serp_item;
      return {
        ...keywordFields(item.keyword_data),
        position: serp?.rank_group,
        url: cleanUrl(serp?.url),
        estimated_traffic: round(serp?.etv, 0),
      };
    }),
  };
}

const KeywordGapSchema = z.object({
  domain,
  competitor_domain: domain,
  location_code: locationCode,
  limit: z.number().int().min(1).max(100).default(50),
  max_competitor_position: z.number().int().min(1).max(100).default(20),
  min_search_volume: z.number().int().min(0).default(10),
});

/** Keywords the competitor ranks for and the domain doesn't rank for at all. */
async function keywordGap(client: DataForSeoClient, req: z.infer<typeof KeywordGapSchema>) {
  const response = await client.request<{
    total_count?: number;
    items?: Array<{ keyword_data?: LabsKeywordData; first_domain_serp_element?: LabsSerpElement }>;
  }>("POST", "dataforseo_labs/google/domain_intersection/live", [
    {
      // intersections=false: keywords target1 ranks for and target2 doesn't.
      target1: req.competitor_domain,
      target2: req.domain,
      intersections: false,
      location_code: req.location_code,
      language_code: "en",
      limit: req.limit,
      item_types: ["organic"],
      filters: [
        ["first_domain_serp_element.rank_group", "<=", req.max_competitor_position],
        "and",
        ["keyword_data.keyword_info.search_volume", ">=", req.min_search_volume],
      ],
      order_by: ["first_domain_serp_element.etv,desc"],
    },
  ]);
  const result = client.extractFirstResult(response);
  return {
    domain: req.domain,
    competitor_domain: req.competitor_domain,
    matching_keywords: result?.total_count ?? 0,
    keywords: (result?.items ?? []).map((item) => ({
      ...keywordFields(item.keyword_data),
      competitor_position: item.first_domain_serp_element?.rank_group,
      competitor_url: cleanUrl(item.first_domain_serp_element?.url),
      competitor_estimated_traffic: round(item.first_domain_serp_element?.etv, 0),
    })),
  };
}

const CompetitorDomainsSchema = z.object({ domain, location_code: locationCode });

/** Domains sharing the most ranking keywords, excluding giant platforms. */
async function competitorDomains(client: DataForSeoClient, req: z.infer<typeof CompetitorDomainsSchema>) {
  const response = await client.request<{
    items?: Array<{
      domain?: string;
      avg_position?: number;
      intersections?: number;
      full_domain_metrics?: { organic?: { count?: number; etv?: number } };
    }>;
  }>("POST", "dataforseo_labs/google/competitors_domain/live", [
    {
      target: req.domain,
      location_code: req.location_code,
      language_code: "en",
      // Leaves out YouTube, Reddit, LinkedIn and the like, which share
      // keywords with everyone.
      exclude_top_domains: true,
      item_types: ["organic"],
      limit: 21,
    },
  ]);
  const items = client.extractFirstResult(response)?.items ?? [];
  return {
    domain: req.domain,
    competitors: items
      // The domain itself comes back as its own top "competitor".
      .filter((c) => c.domain && c.domain !== req.domain)
      .slice(0, 20)
      .map((c) => ({
        domain: c.domain,
        shared_keywords: c.intersections ?? 0,
        avg_position_on_shared: round(c.avg_position, 1),
        total_organic_keywords: c.full_domain_metrics?.organic?.count ?? null,
        estimated_monthly_organic_traffic: round(c.full_domain_metrics?.organic?.etv, 0) ?? null,
      })),
  };
}

const KeywordDataSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
  location_code: locationCode,
});

/** Volume, difficulty, CPC and intent for a list of keywords. */
async function keywordData(client: DataForSeoClient, req: z.infer<typeof KeywordDataSchema>) {
  const response = await client.request<{ items?: LabsKeywordData[] }>(
    "POST",
    "dataforseo_labs/google/keyword_overview/live",
    [{ keywords: req.keywords, location_code: req.location_code, language_code: "en" }]
  );
  const items = client.extractFirstResult(response)?.items ?? [];
  const found = new Set(items.map((i) => i.keyword?.toLowerCase()));
  return {
    keywords: items.map(keywordFields),
    not_found: req.keywords.filter((k) => !found.has(k.toLowerCase())),
  };
}

const RelatedKeywordsSchema = z.object({
  keyword: z.string().trim().min(1).max(200),
  location_code: locationCode,
  limit: z.number().int().min(1).max(100).default(30),
});

async function relatedKeywords(client: DataForSeoClient, req: z.infer<typeof RelatedKeywordsSchema>) {
  const related = await getRelatedKeywords(client, req.keyword, req.location_code, req.limit);
  return {
    keyword: req.keyword,
    related: related
      .filter((r) => r.keyword.toLowerCase() !== req.keyword.toLowerCase())
      .map((r) => ({ ...r, cpc: undefined, cpc_usd: round(r.cpc) }))
      .sort((a, b) => b.search_volume - a.search_volume),
  };
}

const BacklinkSummarySchema = z.object({ domain });

async function backlinkSummary(client: DataForSeoClient, req: z.infer<typeof BacklinkSummarySchema>) {
  const summary = await getBacklinkSummary(client, req.domain);
  if (!summary) throw new Error("Backlink data is not available");
  return summary;
}

// ============================================================================
// Express wiring
// ============================================================================

function handler<S extends ZodTypeAny>(
  name: string,
  schema: S,
  run: (client: DataForSeoClient, req: z.infer<S>) => Promise<unknown>
) {
  return async (req: Request, res: Response) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const path = first?.path.join(".") || "request";
      res.status(400).json({ error_code: "INVALID_REQUEST", message: `${path}: ${first?.message ?? "invalid"}` });
      return;
    }

    const env = getEnv();
    if (!env.DATAFORSEO_LOGIN || !env.DATAFORSEO_PASSWORD) {
      res.status(502).json({ error_code: "UPSTREAM_ERROR", message: "DataForSEO credentials not configured" });
      return;
    }
    const client = new DataForSeoClient(env.DATAFORSEO_LOGIN, env.DATAFORSEO_PASSWORD);

    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("__TIMEOUT__")), ENDPOINT_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([run(client, parsed.data), timeout]);
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "__TIMEOUT__") {
        res.status(504).json({ error_code: "TIMEOUT", message: `Exceeded ${ENDPOINT_TIMEOUT_MS / 1000}s budget` });
        return;
      }
      console.error(`[seo/${name}] Failed:`, err);
      res.status(502).json({ error_code: "UPSTREAM_ERROR", message });
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  };
}

export const seoRankedKeywordsHandler = handler("ranked-keywords", RankedKeywordsSchema, rankedKeywords);
export const seoKeywordGapHandler = handler("keyword-gap", KeywordGapSchema, keywordGap);
export const seoCompetitorDomainsHandler = handler("competitor-domains", CompetitorDomainsSchema, competitorDomains);
export const seoKeywordDataHandler = handler("keyword-data", KeywordDataSchema, keywordData);
export const seoRelatedKeywordsHandler = handler("related-keywords", RelatedKeywordsSchema, relatedKeywords);
export const seoBacklinkSummaryHandler = handler("backlink-summary", BacklinkSummarySchema, backlinkSummary);

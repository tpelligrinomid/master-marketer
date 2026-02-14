import { DataForSeoClient } from "./client";
import {
  BacklinkSummary,
  BacklinkItem,
  AnchorTextItem,
  ReferringDomainItem,
  BacklinkGapItem,
} from "../../types/seo-audit-intelligence";

function cleanDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Check if an error is a 402 (subscription required) and should degrade gracefully.
 */
function isSubscriptionError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("402");
}

interface BacklinkSummaryRawResult {
  target?: string;
  backlinks?: number;
  referring_domains?: number;
  referring_ips?: number;
  referring_links_attributes?: Record<string, number>;
  rank?: number;
  backlinks_spam_score?: number;
  broken_backlinks?: number;
}

/**
 * Get backlink summary for a domain.
 * Degrades gracefully with empty result on 402 (subscription not active).
 */
export async function getBacklinkSummary(
  client: DataForSeoClient,
  domain: string
): Promise<BacklinkSummary | null> {
  try {
    const response = await client.request<BacklinkSummaryRawResult>(
      "POST",
      "backlinks/summary/live",
      [{ target: cleanDomain(domain), include_subdomains: true }]
    );

    const result = client.extractFirstResult(response);
    if (!result) return null;

    const totalBacklinks = result.backlinks ?? 0;
    const nofollowCount = result.referring_links_attributes?.nofollow ?? 0;

    return {
      domain: cleanDomain(domain),
      total_backlinks: totalBacklinks,
      referring_domains: result.referring_domains || 0,
      referring_ips: result.referring_ips || 0,
      dofollow: totalBacklinks - nofollowCount,
      nofollow: nofollowCount,
      domain_rank: result.rank,
      backlinks_spam_score: result.backlinks_spam_score,
      broken_backlinks: result.broken_backlinks,
    };
  } catch (err) {
    if (isSubscriptionError(err)) {
      console.warn(`[Backlinks] Subscription not active — skipping backlink summary for ${domain}`);
      return null;
    }
    throw err;
  }
}

interface BacklinkRawItem {
  url_from?: string;
  url_to?: string;
  anchor?: string;
  dofollow?: boolean;
  domain_from_rank?: number;
  page_from_rank?: number;
  first_seen?: string;
}

interface BacklinksResult {
  total_count?: number;
  items?: BacklinkRawItem[];
}

/**
 * Get backlinks for a domain.
 */
export async function getBacklinks(
  client: DataForSeoClient,
  domain: string,
  limit: number = 100
): Promise<BacklinkItem[]> {
  try {
    const response = await client.request<BacklinksResult>(
      "POST",
      "backlinks/backlinks/live",
      [
        {
          target: cleanDomain(domain),
          include_subdomains: true,
          limit,
          order_by: ["domain_from_rank,desc"],
        },
      ]
    );

    const result = client.extractFirstResult(response);
    return (result?.items || []).map((item) => ({
      source_url: item.url_from || "",
      target_url: item.url_to || "",
      anchor_text: item.anchor,
      dofollow: item.dofollow ?? true,
      domain_rank: item.domain_from_rank,
      page_rank: item.page_from_rank,
      first_seen: item.first_seen,
    }));
  } catch (err) {
    if (isSubscriptionError(err)) {
      console.warn(`[Backlinks] Subscription not active — skipping backlinks for ${domain}`);
      return [];
    }
    throw err;
  }
}

interface AnchorRawItem {
  anchor?: string;
  backlinks?: number;
  referring_domains?: number;
}

interface AnchorsResult {
  total_count?: number;
  items?: AnchorRawItem[];
}

/**
 * Get anchor text distribution for a domain.
 */
export async function getAnchors(
  client: DataForSeoClient,
  domain: string,
  limit: number = 50
): Promise<AnchorTextItem[]> {
  try {
    const response = await client.request<AnchorsResult>(
      "POST",
      "backlinks/anchors/live",
      [
        {
          target: cleanDomain(domain),
          include_subdomains: true,
          limit,
          order_by: ["backlinks,desc"],
        },
      ]
    );

    const result = client.extractFirstResult(response);
    return (result?.items || []).map((item) => ({
      anchor_text: item.anchor || "",
      backlinks_count: item.backlinks || 0,
      referring_domains: item.referring_domains || 0,
    }));
  } catch (err) {
    if (isSubscriptionError(err)) {
      console.warn(`[Backlinks] Subscription not active — skipping anchors for ${domain}`);
      return [];
    }
    throw err;
  }
}

interface ReferringDomainRawItem {
  domain?: string;
  backlinks?: number;
  rank?: number;
  first_seen?: string;
}

interface ReferringDomainsResult {
  total_count?: number;
  items?: ReferringDomainRawItem[];
}

/**
 * Get referring domains for a domain.
 */
export async function getReferringDomains(
  client: DataForSeoClient,
  domain: string,
  limit: number = 100
): Promise<ReferringDomainItem[]> {
  try {
    const response = await client.request<ReferringDomainsResult>(
      "POST",
      "backlinks/referring_domains/live",
      [
        {
          target: cleanDomain(domain),
          include_subdomains: true,
          limit,
          order_by: ["rank,desc"],
        },
      ]
    );

    const result = client.extractFirstResult(response);
    return (result?.items || []).map((item) => ({
      domain: item.domain || "",
      backlinks_count: item.backlinks || 0,
      domain_rank: item.rank,
      first_seen: item.first_seen,
    }));
  } catch (err) {
    if (isSubscriptionError(err)) {
      console.warn(`[Backlinks] Subscription not active — skipping referring domains for ${domain}`);
      return [];
    }
    throw err;
  }
}

interface IntersectionRawItem {
  domain?: string;
  is_intersecting?: boolean;
}

interface BacklinkIntersectionResult {
  total_count?: number;
  items?: IntersectionRawItem[];
}

/**
 * Get backlink gap — domains that link to competitors but not to the client.
 */
export async function getBacklinkIntersection(
  client: DataForSeoClient,
  clientDomain: string,
  competitorDomains: string[]
): Promise<BacklinkGapItem[]> {
  if (competitorDomains.length === 0) return [];

  try {
    // Build the targets object: client first, then competitors
    const targets: Record<string, string> = {};
    targets["1"] = cleanDomain(clientDomain);
    competitorDomains.slice(0, 4).forEach((d, i) => {
      targets[String(i + 2)] = cleanDomain(d);
    });

    const response = await client.request<BacklinkIntersectionResult>(
      "POST",
      "backlinks/domain_intersection/live",
      [
        {
          targets,
          exclude_targets: ["1"], // Exclude domains that already link to client
          limit: 100,
          order_by: ["rank,desc"],
        },
      ]
    );

    const result = client.extractFirstResult(response);
    return (result?.items || []).map((item) => ({
      domain: item.domain || "",
      has_backlink_from: competitorDomains,
      missing_from: [clientDomain],
    }));
  } catch (err) {
    if (isSubscriptionError(err)) {
      console.warn("[Backlinks] Subscription not active — skipping backlink intersection");
      return [];
    }
    throw err;
  }
}

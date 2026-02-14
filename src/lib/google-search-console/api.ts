import { GoogleSearchConsoleClient } from "./client";
import {
  GscSearchQuery,
  GscTopPage,
  GscSitemap,
} from "../../types/seo-audit-intelligence";

// --- GSC API Response Types ---

interface GscSiteEntry {
  siteUrl: string;
  permissionLevel: string;
}

interface GscSitesListResponse {
  siteEntry?: GscSiteEntry[];
}

interface GscSearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscSearchAnalyticsResponse {
  rows?: GscSearchAnalyticsRow[];
}

interface GscSitemapEntry {
  path: string;
  isSitemapsIndex: boolean;
  lastSubmitted?: string;
  lastDownloaded?: string;
  warnings?: string;
  errors?: string;
}

interface GscSitemapsResponse {
  sitemap?: GscSitemapEntry[];
}

// --- Helpers ---

function buildDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 3); // GSC data has ~3 day lag
  const start = new Date(end);
  start.setDate(start.getDate() - 90);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

/**
 * Check if the team account has access to a domain in GSC.
 * Tries multiple URL variants: https://, https://www., http://, and sc-domain:.
 * Returns the matching siteUrl or null.
 */
export async function checkSiteAccess(
  client: GoogleSearchConsoleClient,
  domain: string
): Promise<string | null> {
  const response = await client.get<GscSitesListResponse>("sites");
  const sites = response.siteEntry || [];

  // Strip protocol/trailing slash from domain for matching
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

  // Variants to try, in order of preference
  const variants = [
    `sc-domain:${cleanDomain}`,
    `https://www.${cleanDomain}/`,
    `https://${cleanDomain}/`,
    `http://www.${cleanDomain}/`,
    `http://${cleanDomain}/`,
  ];

  for (const variant of variants) {
    const match = sites.find(
      (s) => s.siteUrl.toLowerCase() === variant.toLowerCase()
    );
    if (match) {
      return match.siteUrl;
    }
  }

  return null;
}

/**
 * Get top search queries by clicks over the last 90 days.
 */
export async function getTopQueries(
  client: GoogleSearchConsoleClient,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GscSearchQuery[]> {
  const response = await client.post<GscSearchAnalyticsResponse>(
    `sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 500,
      dataState: "final",
    }
  );

  return (response.rows || []).map((row) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

/**
 * Get top pages by clicks over the last 90 days.
 */
export async function getTopPages(
  client: GoogleSearchConsoleClient,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GscTopPage[]> {
  const response = await client.post<GscSearchAnalyticsResponse>(
    `sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 100,
      dataState: "final",
    }
  );

  return (response.rows || []).map((row) => ({
    page: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

/**
 * Get sitemap information for the property.
 */
export async function getSitemaps(
  client: GoogleSearchConsoleClient,
  siteUrl: string
): Promise<GscSitemap[]> {
  const response = await client.get<GscSitemapsResponse>(
    `sites/${encodeURIComponent(siteUrl)}/sitemaps`
  );

  return (response.sitemap || []).map((entry) => ({
    path: entry.path,
    is_sitemap_index: entry.isSitemapsIndex,
    last_submitted: entry.lastSubmitted,
    last_downloaded: entry.lastDownloaded,
    warnings: entry.warnings ? parseInt(entry.warnings, 10) : undefined,
    errors: entry.errors ? parseInt(entry.errors, 10) : undefined,
  }));
}

export { buildDateRange };

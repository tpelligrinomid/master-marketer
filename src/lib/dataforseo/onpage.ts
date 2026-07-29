import { DataForSeoClient } from "./client";
import {
  OnPageCrawlSummary,
  OnPagePageData,
  DuplicateTagItem,
  RedirectChainItem,
  NonIndexableItem,
  MicrodataItem,
  SchemaCoverage,
  LighthouseResult,
} from "../../types/seo-audit-intelligence";

/**
 * DataForSEO page checks where `true` means the page is HEALTHY (or is merely
 * descriptive), not that it has a problem. Everything else in `checks` counts
 * as an issue.
 *
 * Without this distinction, `is_https: 150` and `has_micromarkup: 148` get
 * counted as 150 and 148 "pages with issues" — which is how a healthy site
 * ends up reported as broken.
 */
const NON_ISSUE_CHECKS = new Set([
  "has_micromarkup",
  "has_html_doctype",
  "is_https",
  "is_www",
  "canonical",
  "seo_friendly_url",
  "seo_friendly_url_characters_check",
  "seo_friendly_url_dynamic_check",
  "seo_friendly_url_keywords_check",
  "seo_friendly_url_relative_length_check",
  // Descriptive, not a defect: nearly every site embeds a consent manager,
  // analytics frame, or video. Reporting "iframes present on N pages" as an
  // issue produces a finding with no action behind it.
  "has_iframes",
]);

/** True when a check name represents an actual defect. */
export function isIssueCheck(checkName: string): boolean {
  return !NON_ISSUE_CHECKS.has(checkName);
}

/**
 * Submit an OnPage crawl task. Returns immediately with a task ID.
 */
export async function submitCrawlTask(
  client: DataForSeoClient,
  domain: string,
  maxPages: number = 150
): Promise<string> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const response = await client.request<{ id: string }>("POST", "on_page/task_post", [
    {
      target: cleanDomain,
      max_crawl_pages: maxPages,
      validate_micromarkup: true,
      enable_browser_rendering: true,
      enable_javascript: true,
      load_resources: true,
      store_raw_html: false,
    },
  ]);

  const task = response.tasks?.[0];
  if (!task?.id) {
    throw new Error("No task ID returned from OnPage crawl submission");
  }
  if (task.status_code !== 20100 && task.status_code !== 20000) {
    throw new Error(`OnPage task_post failed (${task.status_code}): ${task.status_message}`);
  }

  return task.id;
}

/**
 * Poll for crawl task completion by checking the task summary directly.
 * This is more reliable than `tasks_ready` which is designed for batch processing
 * and may not list tasks that finished with partial results or errors.
 */
export async function pollCrawlReady(
  client: DataForSeoClient,
  taskId: string,
  intervalMs: number = 30000,
  timeoutMs: number = 1800000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await client.request<OnPageSummaryResult>(
      "POST",
      "on_page/summary",
      [{ id: taskId }]
    );

    // Fail fast on actual errors (not found, invalid, etc.)
    // 20000 = OK (results ready), 40602 = Task in Queue (still processing)
    const taskStatus = response.tasks?.[0]?.status_code;
    if (taskStatus && taskStatus !== 20000 && taskStatus !== 40602) {
      throw new Error(
        `OnPage crawl task error (${taskStatus}): ${response.tasks?.[0]?.status_message}`
      );
    }

    const result = client.extractFirstResult(response);
    const progress = result?.crawl_progress;
    const crawled = result?.crawl_status?.pages_crawled ?? 0;
    const queued = result?.crawl_status?.pages_in_queue ?? 0;

    if (progress === "finished") {
      console.log(`[OnPage] Crawl ${taskId} finished — ${crawled} pages crawled`);
      return;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[OnPage] Crawl ${taskId} ${progress ?? "unknown"} — ` +
      `${crawled} crawled, ${queued} in queue (${elapsed}s elapsed)`
    );
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`OnPage crawl timed out after ${timeoutMs / 1000}s`);
}

interface OnPageSummaryResult {
  crawl_progress?: string;
  crawl_status?: {
    pages_crawled?: number;
    pages_in_queue?: number;
  };
  domain_info?: {
    name?: string;
  };
  page_metrics?: {
    links_external?: number;
    links_internal?: number;
    duplicate_title?: number;
    duplicate_description?: number;
    broken_resources?: number;
    broken_links?: number;
    redirect_chains?: number;
    non_indexable?: number;
    checks?: Record<string, number>;
    onpage_score?: number;
  };
}

/**
 * Get the crawl summary for a completed task.
 */
export async function getCrawlSummary(
  client: DataForSeoClient,
  taskId: string
): Promise<OnPageCrawlSummary> {
  const response = await client.request<OnPageSummaryResult>("POST", "on_page/summary", [
    { id: taskId },
  ]);

  const result = client.extractFirstResult(response);
  const metrics = result?.page_metrics;
  const crawlStatus = result?.crawl_status;
  const checks = metrics?.checks || {};

  // Derive pages_with_issues from check counts — only counting checks that
  // represent actual defects. Positive checks (is_https, has_micromarkup, …)
  // would otherwise pin this to the full crawl size on a perfectly healthy site.
  const pagesWithIssues = Object.entries(checks).reduce(
    (max, [name, count]) => (isIssueCheck(name) ? Math.max(max, count) : max),
    0
  );

  // Split the checks map so downstream consumers can't read a positive signal
  // as a problem.
  const issueChecks: Record<string, number> = {};
  const positiveChecks: Record<string, number> = {};
  for (const [name, count] of Object.entries(checks)) {
    if (isIssueCheck(name)) issueChecks[name] = count;
    else positiveChecks[name] = count;
  }

  return {
    domain: result?.domain_info?.name || "",
    pages_crawled: crawlStatus?.pages_crawled || 0,
    pages_with_issues: pagesWithIssues,
    broken_resources: metrics?.broken_resources || 0,
    broken_links_count: metrics?.broken_links || 0,
    duplicate_title_count: metrics?.duplicate_title || 0,
    duplicate_description_count: metrics?.duplicate_description || 0,
    redirect_chains_count: metrics?.redirect_chains || 0,
    non_indexable_count: metrics?.non_indexable || 0,
    onpage_score: metrics?.onpage_score ?? null,
    crawl_status: result?.crawl_progress || "unknown",
    checks,
    issue_checks: issueChecks,
    positive_checks: positiveChecks,
  };
}

interface PagesFilterResult {
  total_items_count?: number;
  items?: Array<{ url?: string }>;
}

/**
 * Count how many crawled pages carry schema markup, and list URLs on both sides.
 *
 * This replaces the previous approach of inferring site-wide schema coverage
 * from a handful of sampled pages. DataForSEO exposes `checks.has_micromarkup`
 * per page, so filtering `on_page/pages` gives the true count across everything
 * crawled — plus the URL list developers need to verify or action the finding.
 */
export async function getSchemaCoverage(
  client: DataForSeoClient,
  taskId: string,
  sampleUrlLimit: number = 25
): Promise<SchemaCoverage> {
  const queryByCheck = async (
    check: string,
    value: boolean
  ): Promise<{ count: number; urls: string[] }> => {
    const response = await client.request<PagesFilterResult>("POST", "on_page/pages", [
      {
        id: taskId,
        limit: sampleUrlLimit,
        filters: [
          ["resource_type", "=", "html"],
          "and",
          ["status_code", "<", 400],
          "and",
          [`checks.${check}`, "=", value],
        ],
      },
    ]);

    const result = client.extractFirstResult(response);
    return {
      count: result?.total_items_count ?? 0,
      urls: (result?.items || []).map((i) => i.url || "").filter(Boolean),
    };
  };

  const [withSchema, withoutSchema, withErrors] = await Promise.all([
    queryByCheck("has_micromarkup", true),
    queryByCheck("has_micromarkup", false),
    queryByCheck("has_micromarkup_errors", true).catch(() => ({ count: 0, urls: [] })),
  ]);

  const totalChecked = withSchema.count + withoutSchema.count;

  return {
    pages_checked: totalChecked,
    pages_with_schema: withSchema.count,
    pages_without_schema: withoutSchema.count,
    pages_with_schema_errors: withErrors.count,
    coverage_pct:
      totalChecked > 0 ? Math.round((withSchema.count / totalChecked) * 100) : null,
    sample_urls_without_schema: withoutSchema.urls,
    sample_urls_with_schema_errors: withErrors.urls,
  };
}

/**
 * Fetch the actual URLs exhibiting each named issue check.
 *
 * Without this, the model has only aggregate counts and picks "example" URLs
 * out of the general crawled-pages list — plausible-looking attributions that
 * a developer will click and find clean. Same `checks.<name>` filter as
 * getSchemaCoverage, one query per check.
 */
export async function getIssueEvidence(
  client: DataForSeoClient,
  taskId: string,
  checkNames: string[],
  urlsPerCheck: number = 10
): Promise<Record<string, string[]>> {
  const entries = await Promise.all(
    checkNames.map(async (check): Promise<[string, string[]]> => {
      try {
        const response = await client.request<PagesFilterResult>("POST", "on_page/pages", [
          {
            id: taskId,
            limit: urlsPerCheck,
            filters: [
              ["resource_type", "=", "html"],
              "and",
              ["status_code", "<", 400],
              "and",
              [`checks.${check}`, "=", true],
            ],
          },
        ]);

        const result = client.extractFirstResult(response);
        return [check, (result?.items || []).map((i) => i.url || "").filter(Boolean)];
      } catch (err) {
        console.warn(
          `[OnPage] Evidence URLs for check "${check}" failed:`,
          err instanceof Error ? err.message : err
        );
        return [check, []];
      }
    })
  );

  const evidence: Record<string, string[]> = {};
  for (const [check, urls] of entries) {
    if (urls.length) evidence[check] = urls;
  }
  return evidence;
}

interface OnPagePageResult {
  url?: string;
  status_code?: number;
  meta?: {
    title?: string;
    description?: string;
    htags?: Record<string, string[]>;
    canonical?: string;
  };
  page_timing?: {
    duration?: number;
  };
  onpage_score?: number;
  meta_robots?: string[];
  is_broken?: boolean;
  is_redirect?: boolean;
  checks?: Record<string, boolean>;
  resource_errors?: number;
  content?: {
    plain_text_word_count?: number;
  };
  page_resource_count?: {
    images?: number;
  };
  images_alt_count?: number;
  internal_links_count?: number;
  external_links_count?: number;
}

function mapPageItem(item: OnPagePageResult): OnPagePageData {
  return {
    url: item.url || "",
    status_code: item.status_code || 0,
    title: item.meta?.title,
    description: item.meta?.description,
    h1: item.meta?.htags?.h1,
    content_word_count: item.content?.plain_text_word_count,
    page_timing: item.page_timing?.duration,
    onpage_score: item.onpage_score,
    meta_robots: item.meta_robots?.join(", "),
    canonical: item.meta?.canonical,
    is_broken: item.is_broken,
    is_redirect: item.is_redirect,
    checks: item.checks,
    resource_errors: item.resource_errors,
    images_count: item.page_resource_count?.images,
    images_without_alt: item.images_alt_count,
    internal_links_count: item.internal_links_count,
    external_links_count: item.external_links_count,
  };
}

/**
 * Get crawled pages data.
 * Returns a balanced sample: live pages (by score ascending for issues)
 * plus a separate set of the healthiest pages. This prevents Claude from
 * seeing only the worst pages and over-extrapolating error rates.
 */
export async function getCrawlPages(
  client: DataForSeoClient,
  taskId: string,
  limit: number = 100
): Promise<OnPagePageData[]> {
  // Fetch live (status 200) pages sorted by worst score first for issue detection
  const [worstResponse, bestResponse] = await Promise.all([
    client.request<{ items?: OnPagePageResult[] }>(
      "POST",
      "on_page/pages",
      [{
        id: taskId,
        limit: Math.ceil(limit * 0.6),
        order_by: ["onpage_score,asc"],
        filters: [["resource_type", "=", "html"], "and", ["status_code", "<", 400]],
      }]
    ),
    client.request<{ items?: OnPagePageResult[] }>(
      "POST",
      "on_page/pages",
      [{
        id: taskId,
        limit: Math.ceil(limit * 0.4),
        order_by: ["onpage_score,desc"],
        filters: [["resource_type", "=", "html"], "and", ["status_code", "<", 400]],
      }]
    ),
  ]);

  const worstItems = client.extractFirstResult(worstResponse)?.items || [];
  const bestItems = client.extractFirstResult(bestResponse)?.items || [];

  // Merge, dedup by URL
  const seen = new Set<string>();
  const pages: OnPagePageData[] = [];

  for (const item of [...worstItems, ...bestItems]) {
    const url = item.url || "";
    if (!seen.has(url)) {
      seen.add(url);
      pages.push(mapPageItem(item));
    }
  }

  return pages;
}

interface DuplicateTagResult {
  items?: Array<{
    accumulator?: string;
    pages?: Array<{ url?: string }>;
  }>;
}

/**
 * Get duplicate title and description tags.
 */
export async function getDuplicateTags(
  client: DataForSeoClient,
  taskId: string
): Promise<DuplicateTagItem[]> {
  const results: DuplicateTagItem[] = [];

  for (const tagType of ["title", "description"] as const) {
    try {
      const response = await client.request<DuplicateTagResult>(
        "POST",
        `on_page/duplicate_tags`,
        [{ id: taskId, type: tagType, limit: 20 }]
      );

      const result = client.extractFirstResult(response);
      for (const item of result?.items || []) {
        results.push({
          tag_type: tagType,
          duplicate_value: item.accumulator || "",
          pages: (item.pages || []).map((p) => p.url || ""),
        });
      }
    } catch (err) {
      console.warn(`[OnPage] Duplicate ${tagType} fetch failed:`, err instanceof Error ? err.message : err);
    }
  }

  return results;
}

interface RedirectChainResult {
  items?: Array<{
    url?: string;
    redirect_url?: string;
    is_redirect_loop?: boolean;
    redirect_chain_count?: number;
  }>;
}

/**
 * Get redirect chains.
 */
export async function getRedirectChains(
  client: DataForSeoClient,
  taskId: string
): Promise<RedirectChainItem[]> {
  const response = await client.request<RedirectChainResult>(
    "POST",
    "on_page/redirect_chains",
    [{ id: taskId, limit: 50 }]
  );

  const result = client.extractFirstResult(response);
  return (result?.items || []).map((item) => ({
    from_url: item.url || "",
    to_url: item.redirect_url || "",
    chain_length: item.redirect_chain_count || 0,
    is_loop: item.is_redirect_loop || false,
  }));
}

interface NonIndexableResult {
  items?: Array<{
    url?: string;
    reason?: string;
  }>;
}

/**
 * Get non-indexable pages.
 */
export async function getNonIndexable(
  client: DataForSeoClient,
  taskId: string
): Promise<NonIndexableItem[]> {
  const response = await client.request<NonIndexableResult>(
    "POST",
    "on_page/non_indexable",
    [{ id: taskId, limit: 50 }]
  );

  const result = client.extractFirstResult(response);
  return (result?.items || []).map((item) => ({
    url: item.url || "",
    reason: item.reason || "unknown",
  }));
}

interface MicrodataResult {
  items?: Array<{
    type?: string;
    inspection_info?: {
      types?: string[];
    };
  }>;
}

/**
 * Get the schema types present on specific pages.
 *
 * NOTE: `on_page/microdata` is a PER-PAGE endpoint — `url` is a required
 * parameter alongside `id`. Calling it with only the task id (as this
 * previously did) returns nothing usable, which is why schema was reported
 * as near-absent on sites that mark up every page.
 *
 * Site-wide coverage comes from getSchemaCoverage(); this call supplies the
 * TYPE breakdown for the pages we inspect.
 */
export async function getMicrodata(
  client: DataForSeoClient,
  taskId: string,
  urls: string[]
): Promise<MicrodataItem[]> {
  if (!urls.length) return [];

  const results = await Promise.allSettled(
    urls.map(async (url): Promise<MicrodataItem | null> => {
      const response = await client.request<MicrodataResult>("POST", "on_page/microdata", [
        { id: taskId, url },
      ]);

      const result = client.extractFirstResult(response);
      const items = result?.items || [];
      if (!items.length) return null;

      const types = new Set<string>();
      for (const item of items) {
        for (const t of item.inspection_info?.types || []) types.add(t);
      }
      if (!types.size) return null;

      return { url, types: [...types], items_count: items.length, source: "dataforseo" };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<MicrodataItem> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

interface LighthouseRawResult {
  categories?: {
    performance?: { score?: number };
    accessibility?: { score?: number };
    "best-practices"?: { score?: number };
    seo?: { score?: number };
  };
  audits?: {
    "first-contentful-paint"?: { numericValue?: number };
    "largest-contentful-paint"?: { numericValue?: number };
    "total-blocking-time"?: { numericValue?: number };
    "cumulative-layout-shift"?: { numericValue?: number };
    "speed-index"?: { numericValue?: number };
    interactive?: { numericValue?: number };
  };
}

/**
 * Run Lighthouse audits on key pages via DataForSEO.
 */
export async function getLighthouseResults(
  client: DataForSeoClient,
  urls: string[]
): Promise<LighthouseResult[]> {
  const results = await Promise.allSettled(
    urls.map(async (url): Promise<LighthouseResult> => {
      const response = await client.request<LighthouseRawResult>(
        "POST",
        "on_page/lighthouse/live/json",
        [{ url, for_mobile: true }]
      );

      const result = client.extractFirstResult(response);
      const categories = result?.categories;
      const audits = result?.audits;

      return {
        url,
        performance_score: categories?.performance?.score
          ? Math.round(categories.performance.score * 100)
          : undefined,
        accessibility_score: categories?.accessibility?.score
          ? Math.round(categories.accessibility.score * 100)
          : undefined,
        best_practices_score: categories?.["best-practices"]?.score
          ? Math.round(categories["best-practices"].score * 100)
          : undefined,
        seo_score: categories?.seo?.score
          ? Math.round(categories.seo.score * 100)
          : undefined,
        first_contentful_paint: audits?.["first-contentful-paint"]?.numericValue,
        largest_contentful_paint: audits?.["largest-contentful-paint"]?.numericValue,
        total_blocking_time: audits?.["total-blocking-time"]?.numericValue,
        cumulative_layout_shift: audits?.["cumulative-layout-shift"]?.numericValue,
        speed_index: audits?.["speed-index"]?.numericValue,
        time_to_interactive: audits?.interactive?.numericValue,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<LighthouseResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

import { DataForSeoClient } from "./client";
import {
  OnPageCrawlSummary,
  OnPagePageData,
  DuplicateTagItem,
  RedirectChainItem,
  NonIndexableItem,
  MicrodataItem,
  LighthouseResult,
} from "../../types/seo-audit-intelligence";

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
    pages_with_microdata?: number;
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

  // Derive pages_with_issues from check counts (pages with any issue)
  const pagesWithIssues = Object.values(checks).reduce(
    (max, v) => Math.max(max, v),
    0
  );

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
    pages_with_microdata: metrics?.pages_with_microdata || 0,
    onpage_score: metrics?.onpage_score ?? null,
    crawl_status: result?.crawl_progress || "unknown",
    checks,
  };
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
    url?: string;
    types?: string[];
    items_count?: number;
  }>;
}

/**
 * Get microdata (schema markup) inventory.
 */
export async function getMicrodata(
  client: DataForSeoClient,
  taskId: string
): Promise<MicrodataItem[]> {
  const response = await client.request<MicrodataResult>(
    "POST",
    "on_page/microdata",
    [{ id: taskId, limit: 50 }]
  );

  const result = client.extractFirstResult(response);
  return (result?.items || []).map((item) => ({
    url: item.url || "",
    types: item.types || [],
    items_count: item.items_count || 0,
  }));
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

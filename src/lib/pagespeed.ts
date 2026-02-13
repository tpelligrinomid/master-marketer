import { PageSpeedResult } from "../types/seo-audit-intelligence";

const PAGESPEED_API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PageSpeedApiResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
    };
    audits?: {
      "first-contentful-paint"?: { numericValue?: number };
      "largest-contentful-paint"?: { numericValue?: number };
      "total-blocking-time"?: { numericValue?: number };
      "cumulative-layout-shift"?: { numericValue?: number };
      "speed-index"?: { numericValue?: number };
      interactive?: { numericValue?: number };
    };
  };
  loadingExperience?: {
    metrics?: {
      FIRST_CONTENTFUL_PAINT_MS?: { percentile?: number };
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number };
      FIRST_INPUT_DELAY_MS?: { percentile?: number };
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile?: number };
      INTERACTION_TO_NEXT_PAINT?: { percentile?: number };
      EXPERIMENTAL_TIME_TO_FIRST_BYTE?: { percentile?: number };
    };
  };
}

async function fetchPageSpeed(
  url: string,
  apiKey?: string
): Promise<PageSpeedResult> {
  const params = new URLSearchParams({
    url: url.startsWith("http") ? url : `https://${url}`,
    strategy: "mobile",
    category: "performance",
  });

  if (apiKey) {
    params.set("key", apiKey);
  }

  const response = await fetch(`${PAGESPEED_API_BASE}?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PageSpeed API error (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as PageSpeedApiResponse;

  const lighthouse = data.lighthouseResult;
  const audits = lighthouse?.audits;
  const fieldMetrics = data.loadingExperience?.metrics;

  return {
    url,
    performance_score: lighthouse?.categories?.performance?.score
      ? Math.round(lighthouse.categories.performance.score * 100)
      : undefined,
    first_contentful_paint: audits?.["first-contentful-paint"]?.numericValue,
    largest_contentful_paint: audits?.["largest-contentful-paint"]?.numericValue,
    total_blocking_time: audits?.["total-blocking-time"]?.numericValue,
    cumulative_layout_shift: audits?.["cumulative-layout-shift"]?.numericValue,
    speed_index: audits?.["speed-index"]?.numericValue,
    time_to_interactive: audits?.interactive?.numericValue,
    field_data: fieldMetrics
      ? {
          fcp_p75: fieldMetrics.FIRST_CONTENTFUL_PAINT_MS?.percentile,
          lcp_p75: fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
          fid_p75: fieldMetrics.FIRST_INPUT_DELAY_MS?.percentile,
          cls_p75: fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile,
          inp_p75: fieldMetrics.INTERACTION_TO_NEXT_PAINT?.percentile,
          ttfb_p75: fieldMetrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile,
        }
      : undefined,
  };
}

/**
 * Get PageSpeed Insights results for multiple URLs.
 * Uses Promise.allSettled for graceful degradation.
 */
export async function getPageSpeedResults(
  urls: string[],
  apiKey?: string
): Promise<PageSpeedResult[]> {
  const results = await Promise.allSettled(
    urls.map((url) => fetchPageSpeed(url, apiKey))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PageSpeedResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

import Firecrawl from "@mendable/firecrawl-js";
import { ApifyClient } from "apify-client";
import { FirecrawlPage } from "../types/research-intelligence";

const MAX_CHARS_PER_PAGE = 2000;

// Target URL paths for marketing intelligence
const PAGE_PATHS = [
  "",              // Homepage
  "/about",
  "/about-us",
  "/about/team",
  "/company",
  "/solutions",
  "/products",
  "/services",
  "/platform",
  "/technology",
  "/features",
  "/case-studies",
  "/case-study",
  "/casestudies",
  "/customers",
  "/customer-stories",
  "/success-stories",
  "/testimonials",
  "/pricing",
  "/partners",
  "/industries",
  "/resources",
  "/blog",
  "/insights",
  "/why-us",
  "/contact",
];

function normalizeUrl(domain: string): string {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  return url.replace(/\/+$/, "");
}

/**
 * Scrape a single URL via Firecrawl. Returns null on failure.
 */
async function scrapeSingleUrl(
  client: Firecrawl,
  url: string
): Promise<FirecrawlPage | null> {
  try {
    const result = await client.scrape(url, {
      formats: ["markdown"],
    });

    // v2 API returns data directly
    const markdown = (result as { markdown?: string }).markdown || "";
    if (!markdown) return null;

    const metadata = (result as { metadata?: { title?: string; statusCode?: number } }).metadata;

    return {
      url,
      title: metadata?.title,
      markdown: markdown.slice(0, MAX_CHARS_PER_PAGE),
      status_code: metadata?.statusCode,
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err?.statusCode === 404 || err?.message?.includes("404")) {
      // Expected — many target paths won't exist
      return null;
    }
    console.warn(`Firecrawl scrape failed for ${url}:`, err?.message || error);
    return null;
  }
}

/**
 * Fallback: scrape pages via Apify website-content-crawler.
 * Uses the same target URLs but different proxy infrastructure.
 */
async function scrapeViaApify(
  domain: string,
  apifyApiKey: string
): Promise<FirecrawlPage[]> {
  const client = new ApifyClient({ token: apifyApiKey });
  const baseUrl = normalizeUrl(domain);
  const startUrls = PAGE_PATHS.map((path) => ({ url: `${baseUrl}${path}` }));

  console.log(`[Apify fallback] Crawling ${domain} (${startUrls.length} URLs)`);

  const run = await client.actor("apify/website-content-crawler").call(
    {
      startUrls,
      maxCrawlPages: startUrls.length,
      crawlerType: "cheerio",
      maxConcurrency: 10,
    },
    { timeout: 180 }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const pages: FirecrawlPage[] = items
    .map((item) => {
      const page = item as Record<string, unknown>;
      const markdown = (page.text as string) || (page.markdown as string) || "";
      if (!markdown) return null;
      return {
        url: page.url as string,
        title: page.metadata
          ? (page.metadata as Record<string, unknown>).title as string | undefined
          : undefined,
        markdown: markdown.slice(0, MAX_CHARS_PER_PAGE),
      };
    })
    .filter((p): p is FirecrawlPage => p !== null);

  console.log(`[Apify fallback] Got ${pages.length} pages for ${domain}`);
  return pages;
}

/**
 * Scrape targeted pages from a domain using Firecrawl.
 * Falls back to Apify website-content-crawler if Firecrawl returns nothing.
 */
export async function scrapeWebsite(
  domain: string,
  apiKey: string,
  apifyApiKey?: string
): Promise<FirecrawlPage[]> {
  const client = new Firecrawl({ apiKey });
  const baseUrl = normalizeUrl(domain);

  const pageUrls = PAGE_PATHS.map((path) => `${baseUrl}${path}`);

  // Scrape all pages in parallel
  const results = await Promise.allSettled(
    pageUrls.map((url) => scrapeSingleUrl(client, url))
  );

  const pages: FirecrawlPage[] = results
    .filter(
      (r): r is PromiseFulfilledResult<FirecrawlPage | null> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((page): page is FirecrawlPage => page !== null);

  // Fallback to Apify if Firecrawl got nothing
  if (pages.length === 0 && apifyApiKey) {
    console.warn(`[Firecrawl] Zero pages for ${domain}, trying Apify fallback...`);
    try {
      return await scrapeViaApify(domain, apifyApiKey);
    } catch (err) {
      console.warn(`[Apify fallback] Failed for ${domain}:`, err instanceof Error ? err.message : err);
    }
  }

  return pages;
}

import Firecrawl from "@mendable/firecrawl-js";
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
 * Scrape targeted pages from a domain using Firecrawl.
 * Tries common marketing-relevant paths and returns whatever succeeds.
 */
export async function scrapeWebsite(
  domain: string,
  apiKey: string
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

  return pages;
}

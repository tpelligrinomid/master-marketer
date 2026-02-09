import FirecrawlApp from "@mendable/firecrawl-js";
import { FirecrawlPage } from "../types/research-intelligence";

// URL patterns to target for marketing intelligence
const TARGET_PATHS = [
  "/",
  "/about",
  "/about-us",
  "/solutions",
  "/products",
  "/services",
  "/platform",
  "/features",
  "/pricing",
  "/customers",
  "/case-studies",
  "/testimonials",
  "/blog",
  "/resources",
  "/partners",
  "/industries",
  "/technology",
  "/why-*",
  "/company",
  "/team",
];

const MAX_PAGES = 20;
const MAX_CHARS_PER_PAGE = 2000;

interface FirecrawlMapResult {
  links?: string[];
}

interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      statusCode?: number;
    };
  };
}

/**
 * Scrape up to 20 targeted pages from a domain using Firecrawl.
 * Returns clean markdown for each page, truncated to 2000 chars.
 */
export async function scrapeWebsite(
  domain: string,
  apiKey: string
): Promise<FirecrawlPage[]> {
  const app = new FirecrawlApp({ apiKey });
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;

  // Step 1: Map the site to discover URLs
  let urls: string[] = [];
  try {
    const mapResult = (await app.mapUrl(baseUrl)) as FirecrawlMapResult;
    urls = mapResult.links || [];
  } catch (err) {
    console.warn(`Firecrawl map failed for ${domain}, falling back to target paths:`, err);
    // Fall back to constructing URLs from target paths
    urls = TARGET_PATHS.map((path) => `${baseUrl}${path}`);
  }

  // Step 2: Filter and prioritize URLs matching target patterns
  const prioritized = prioritizeUrls(urls, baseUrl);
  const toScrape = prioritized.slice(0, MAX_PAGES);

  // Step 3: Scrape each URL
  const pages: FirecrawlPage[] = [];
  const scrapePromises = toScrape.map(async (url) => {
    try {
      const result = (await app.scrapeUrl(url, {
        formats: ["markdown"],
      })) as FirecrawlScrapeResult;

      if (result.success && result.data?.markdown) {
        return {
          url,
          title: result.data.metadata?.title,
          markdown: result.data.markdown.slice(0, MAX_CHARS_PER_PAGE),
          status_code: result.data.metadata?.statusCode,
        };
      }
    } catch (err) {
      console.warn(`Firecrawl scrape failed for ${url}:`, err);
    }
    return null;
  });

  const results = await Promise.allSettled(scrapePromises);
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      pages.push(result.value);
    }
  }

  return pages;
}

/**
 * Prioritize URLs based on marketing-relevant path patterns.
 */
function prioritizeUrls(urls: string[], baseUrl: string): string[] {
  const scored: { url: string; score: number }[] = [];

  for (const url of urls) {
    // Skip external links, PDFs, images, etc.
    try {
      const parsed = new URL(url);
      const base = new URL(baseUrl);
      if (parsed.hostname !== base.hostname) continue;
      if (/\.(pdf|png|jpg|jpeg|gif|svg|css|js|xml|json)$/i.test(parsed.pathname)) continue;
    } catch {
      continue;
    }

    let score = 0;
    const lower = url.toLowerCase();

    // High-value pages
    if (lower.includes("/about") || lower.includes("/company")) score += 10;
    if (lower.includes("/solution") || lower.includes("/product")) score += 10;
    if (lower.includes("/platform") || lower.includes("/feature")) score += 9;
    if (lower.includes("/case-stud") || lower.includes("/testimonial")) score += 9;
    if (lower.includes("/customer")) score += 8;
    if (lower.includes("/pricing")) score += 8;
    if (lower.includes("/service")) score += 7;
    if (lower.includes("/industr")) score += 7;
    if (lower.includes("/technolog")) score += 6;
    if (lower.includes("/partner")) score += 6;
    if (lower.includes("/blog")) score += 5;
    if (lower.includes("/resource")) score += 5;
    if (lower.includes("/why")) score += 5;

    // Homepage gets high priority
    try {
      const parsed = new URL(url);
      if (parsed.pathname === "/" || parsed.pathname === "") score += 10;
    } catch {
      // ignore
    }

    // Penalize deep paths (likely blog posts, not main pages)
    const pathDepth = (url.split("/").length - 3); // subtract protocol + domain parts
    if (pathDepth > 3) score -= 3;

    scored.push({ url, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s) => s.url);
}

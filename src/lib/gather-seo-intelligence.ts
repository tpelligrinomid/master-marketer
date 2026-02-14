import { SeoAuditInput } from "../types/seo-audit-input";
import {
  CompanySeoIntelligence,
  SeoIntelligencePackage,
  SerpResult,
  LlmMention,
  LlmResponse,
  PageSpeedResult,
  BacklinkGapItem,
  OnPageCrawlSummary,
  OnPagePageData,
  DuplicateTagItem,
  RedirectChainItem,
  NonIndexableItem,
  MicrodataItem,
  LighthouseResult,
  KeywordsEverywhereData,
} from "../types/seo-audit-intelligence";
import {
  DataForSeoClient,
  submitCrawlTask,
  pollCrawlReady,
  getCrawlSummary,
  getCrawlPages,
  getDuplicateTags,
  getRedirectChains,
  getNonIndexable,
  getMicrodata,
  getLighthouseResults,
  getRankedKeywords,
  getDomainIntersection,
  getCompetitorDomains,
  getBacklinkSummary,
  getBacklinks,
  getAnchors,
  getReferringDomains,
  getBacklinkIntersection,
  getSerpResults,
  getLlmMentions,
  getChatGptResponses,
  getPerplexityResponses,
} from "./dataforseo";
import { getPageSpeedResults } from "./pagespeed";
import { getDomainMetrics } from "./moz";
import {
  KeywordsEverywhereClient,
  getKeywordMetrics,
  getRelatedKeywords,
  getPasfKeywords,
  getDomainTraffic,
} from "./keywords-everywhere";

export interface GatherSeoConfig {
  dataforseoLogin?: string;
  dataforseoPassword?: string;
  mozApiKey?: string;
  pageSpeedApiKey?: string;
  keywordsEverywhereApiKey?: string;
}

// --- Stream Gatherers ---

async function gatherKeywordsStream(
  dfsClient: DataForSeoClient,
  clientDomain: string,
  competitorDomains: string[],
  errors: string[]
): Promise<{
  clientKeywords: CompanySeoIntelligence;
  competitorKeywords: Map<string, CompanySeoIntelligence>;
}> {
  const clientKeywords: CompanySeoIntelligence = {
    company_name: "",
    domain: clientDomain,
    errors: [],
  };
  const competitorKeywords = new Map<string, CompanySeoIntelligence>();

  // Initialize competitor entries
  for (const domain of competitorDomains) {
    competitorKeywords.set(domain, {
      company_name: "",
      domain,
      errors: [],
    });
  }

  const promises: Promise<void>[] = [];

  // Client ranked keywords
  promises.push(
    getRankedKeywords(dfsClient, clientDomain)
      .then((data) => {
        clientKeywords.ranked_keywords = data;
        console.log(`[SEO] Ranked keywords for client: ${data.length}`);
      })
      .catch((err) => {
        const msg = `Ranked keywords failed for ${clientDomain}: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  // Competitor ranked keywords
  for (const domain of competitorDomains) {
    promises.push(
      getRankedKeywords(dfsClient, domain)
        .then((data) => {
          competitorKeywords.get(domain)!.ranked_keywords = data;
          console.log(`[SEO] Ranked keywords for ${domain}: ${data.length}`);
        })
        .catch((err) => {
          const msg = `Ranked keywords failed for ${domain}: ${err.message}`;
          console.warn(`[SEO] ${msg}`);
          errors.push(msg);
        })
    );
  }

  // Content gap (domain intersection for each competitor)
  for (const domain of competitorDomains) {
    promises.push(
      getDomainIntersection(dfsClient, clientDomain, domain)
        .then((data) => {
          clientKeywords.content_gap_keywords = [
            ...(clientKeywords.content_gap_keywords || []),
            ...data,
          ];
          console.log(`[SEO] Content gap vs ${domain}: ${data.length} keywords`);
        })
        .catch((err) => {
          const msg = `Content gap failed for ${domain}: ${err.message}`;
          console.warn(`[SEO] ${msg}`);
          errors.push(msg);
        })
    );
  }

  // Competitor domains
  promises.push(
    getCompetitorDomains(dfsClient, clientDomain)
      .then((data) => {
        clientKeywords.competitor_domains = data;
      })
      .catch((err) => {
        const msg = `Competitor domains failed: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  await Promise.allSettled(promises);
  return { clientKeywords, competitorKeywords };
}

async function gatherBacklinksStream(
  dfsClient: DataForSeoClient,
  clientDomain: string,
  competitorDomains: string[],
  errors: string[]
): Promise<{
  clientBacklinks: Partial<CompanySeoIntelligence>;
  competitorBacklinks: Map<string, Partial<CompanySeoIntelligence>>;
  backlinkGap: BacklinkGapItem[];
}> {
  const clientBacklinks: Partial<CompanySeoIntelligence> = {};
  const competitorBacklinks = new Map<string, Partial<CompanySeoIntelligence>>();
  let backlinkGap: BacklinkGapItem[] = [];

  for (const domain of competitorDomains) {
    competitorBacklinks.set(domain, {});
  }

  const promises: Promise<void>[] = [];

  // Client backlinks
  promises.push(
    getBacklinkSummary(dfsClient, clientDomain)
      .then((data) => {
        clientBacklinks.backlink_summary = data || undefined;
      })
      .catch((err) => {
        const msg = `Backlink summary failed for ${clientDomain}: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  promises.push(
    getBacklinks(dfsClient, clientDomain)
      .then((data) => {
        clientBacklinks.backlinks = data;
      })
      .catch((err) => {
        const msg = `Backlinks failed for ${clientDomain}: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  promises.push(
    getAnchors(dfsClient, clientDomain)
      .then((data) => {
        clientBacklinks.anchors = data;
      })
      .catch((err) => {
        const msg = `Anchors failed for ${clientDomain}: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  promises.push(
    getReferringDomains(dfsClient, clientDomain)
      .then((data) => {
        clientBacklinks.referring_domains = data;
      })
      .catch((err) => {
        const msg = `Referring domains failed for ${clientDomain}: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  // Competitor backlink summaries
  for (const domain of competitorDomains) {
    promises.push(
      getBacklinkSummary(dfsClient, domain)
        .then((data) => {
          competitorBacklinks.get(domain)!.backlink_summary = data || undefined;
        })
        .catch((err) => {
          const msg = `Backlink summary failed for ${domain}: ${err.message}`;
          console.warn(`[SEO] ${msg}`);
          errors.push(msg);
        })
    );
  }

  // Backlink gap
  promises.push(
    getBacklinkIntersection(dfsClient, clientDomain, competitorDomains)
      .then((data) => {
        backlinkGap = data;
      })
      .catch((err) => {
        const msg = `Backlink intersection failed: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  await Promise.allSettled(promises);
  return { clientBacklinks, competitorBacklinks, backlinkGap };
}

async function gatherSerpStream(
  dfsClient: DataForSeoClient,
  keywords: string[],
  errors: string[]
): Promise<SerpResult[]> {
  try {
    const results = await getSerpResults(dfsClient, keywords);
    console.log(`[SEO] SERP results: ${results.length} keywords analyzed`);
    return results;
  } catch (err) {
    const msg = `SERP analysis failed: ${err instanceof Error ? err.message : err}`;
    console.warn(`[SEO] ${msg}`);
    errors.push(msg);
    return [];
  }
}

async function gatherAeoStream(
  dfsClient: DataForSeoClient,
  brandName: string,
  keywords: string[],
  errors: string[]
): Promise<{
  llmMentions: LlmMention[];
  llmResponses: LlmResponse[];
}> {
  let llmMentions: LlmMention[] = [];
  let llmResponses: LlmResponse[] = [];

  // Build AEO queries from keywords
  const aeoQueries = keywords.slice(0, 10).map((kw) => `best ${kw} solutions`);

  const promises: Promise<void>[] = [];

  promises.push(
    getLlmMentions(dfsClient, brandName, keywords.slice(0, 15))
      .then((data) => {
        llmMentions = data;
        console.log(`[SEO] LLM mentions: ${data.length} checked`);
      })
      .catch((err) => {
        const msg = `LLM mentions failed: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  promises.push(
    getChatGptResponses(dfsClient, aeoQueries)
      .then((data) => {
        llmResponses = [...llmResponses, ...data];
        console.log(`[SEO] ChatGPT responses: ${data.length}`);
      })
      .catch((err) => {
        const msg = `ChatGPT responses failed: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  promises.push(
    getPerplexityResponses(dfsClient, aeoQueries)
      .then((data) => {
        llmResponses = [...llmResponses, ...data];
        console.log(`[SEO] Perplexity responses: ${data.length}`);
      })
      .catch((err) => {
        const msg = `Perplexity responses failed: ${err.message}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  await Promise.allSettled(promises);

  // Mark brand mentions in LLM responses
  const brandLower = brandName.toLowerCase();
  for (const resp of llmResponses) {
    if (resp.response_text?.toLowerCase().includes(brandLower)) {
      resp.brand_mentioned = true;
    }
  }

  return { llmMentions, llmResponses };
}

async function gatherKeywordsEverywhereStream(
  keClient: KeywordsEverywhereClient,
  keywords: string[],
  clientDomain: string,
  competitorDomains: string[],
  errors: string[]
): Promise<KeywordsEverywhereData> {
  const result: KeywordsEverywhereData = {
    keyword_metrics: [],
    related_keywords: [],
    pasf_keywords: [],
    domain_traffic: [],
  };

  // Pick seed keywords for related/PASF expansion (top 8)
  const seedsForExpansion = keywords.slice(0, 8);
  // All domains for traffic comparison
  const allDomains = [clientDomain, ...competitorDomains].slice(0, 5);

  const promises: Promise<void>[] = [];

  // 1. Keyword metrics for up to 100 keywords
  promises.push(
    getKeywordMetrics(keClient, keywords.slice(0, 100))
      .then((data) => {
        result.keyword_metrics = data;
        console.log(`[SEO] KE keyword metrics: ${data.length} enriched`);
      })
      .catch((err) => {
        const msg = `KE keyword metrics failed: ${err instanceof Error ? err.message : err}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  // 2. Related keywords for each seed
  for (const seed of seedsForExpansion) {
    promises.push(
      getRelatedKeywords(keClient, seed)
        .then((data) => {
          result.related_keywords.push(...data);
        })
        .catch((err) => {
          const msg = `KE related keywords failed for "${seed}": ${err instanceof Error ? err.message : err}`;
          console.warn(`[SEO] ${msg}`);
          errors.push(msg);
        })
    );
  }

  // 3. PASF keywords for each seed
  for (const seed of seedsForExpansion) {
    promises.push(
      getPasfKeywords(keClient, seed)
        .then((data) => {
          result.pasf_keywords.push(...data);
        })
        .catch((err) => {
          const msg = `KE PASF keywords failed for "${seed}": ${err instanceof Error ? err.message : err}`;
          console.warn(`[SEO] ${msg}`);
          errors.push(msg);
        })
    );
  }

  // 4. Domain traffic for client + competitors
  promises.push(
    getDomainTraffic(keClient, allDomains)
      .then((data) => {
        result.domain_traffic = data;
        console.log(`[SEO] KE domain traffic: ${data.length} domains`);
      })
      .catch((err) => {
        const msg = `KE domain traffic failed: ${err instanceof Error ? err.message : err}`;
        console.warn(`[SEO] ${msg}`);
        errors.push(msg);
      })
  );

  await Promise.allSettled(promises);

  // Dedupe related + PASF keywords
  result.related_keywords = dedupeByKeyword(result.related_keywords);
  result.pasf_keywords = dedupeByKeyword(result.pasf_keywords);

  console.log(
    `[SEO] KE totals — metrics: ${result.keyword_metrics.length}, related: ${result.related_keywords.length}, PASF: ${result.pasf_keywords.length}, traffic: ${result.domain_traffic.length}`
  );

  return result;
}

/**
 * Fetch a URL and extract JSON-LD schema types.
 * Supplements DataForSEO microdata which may miss JSON-LD script tags.
 */
async function detectJsonLdSchemaTypes(url: string): Promise<{ url: string; types: string[]; items_count: number } | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "MasterMarketer-SEO-Audit/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    // Extract all <script type="application/ld+json"> blocks
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const types = new Set<string>();
    let match: RegExpExecArray | null;
    let itemCount = 0;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
        for (const item of items) {
          if (item["@type"]) {
            const itemTypes = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
            for (const t of itemTypes) types.add(t);
            itemCount++;
          }
        }
      } catch {
        // Invalid JSON-LD block, skip
      }
    }

    if (types.size === 0) return null;
    return { url, types: [...types], items_count: itemCount };
  } catch {
    return null;
  }
}

/**
 * Detect JSON-LD schema on sample pages and merge with DataForSEO microdata.
 * Picks homepage + a few diverse crawled pages to get a representative sample.
 */
async function supplementMicrodataWithJsonLd(
  existingMicrodata: MicrodataItem[] | undefined,
  clientDomain: string,
  crawledPages: OnPagePageData[] | undefined,
  errors: string[]
): Promise<MicrodataItem[]> {
  const merged = [...(existingMicrodata || [])];
  const existingUrls = new Set(merged.map((m) => m.url));

  // Pick sample URLs: homepage + up to 4 diverse pages from the crawl
  const sampleUrls = new Set<string>();
  sampleUrls.add(`https://${clientDomain}`);
  sampleUrls.add(`https://www.${clientDomain}`);

  if (crawledPages?.length) {
    // Pick pages from different URL paths for diversity
    const pathBuckets = new Map<string, string>();
    for (const page of crawledPages) {
      if (page.status_code !== 200 || page.is_redirect) continue;
      try {
        const path = new URL(page.url).pathname.split("/").filter(Boolean)[0] || "/";
        if (!pathBuckets.has(path)) {
          pathBuckets.set(path, page.url);
        }
      } catch {
        continue;
      }
    }
    for (const url of pathBuckets.values()) {
      sampleUrls.add(url);
      if (sampleUrls.size >= 6) break;
    }
  }

  const results = await Promise.allSettled(
    [...sampleUrls].map((url) => detectJsonLdSchemaTypes(url))
  );

  let newFindings = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const { url, types, items_count } = result.value;
      if (!existingUrls.has(url)) {
        merged.push({ url, types, items_count });
        existingUrls.add(url);
        newFindings++;
      }
    }
  }

  if (newFindings > 0) {
    console.log(`[SEO] JSON-LD supplementary check: found schema on ${newFindings} additional pages`);
  } else if ((existingMicrodata?.length || 0) === 0) {
    console.log(`[SEO] JSON-LD supplementary check: no JSON-LD found on sampled pages either`);
  }

  return merged;
}

function dedupeByKeyword<T extends { keyword: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.keyword) return false;
    const key = item.keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Main Orchestrator ---

/**
 * Gather all SEO intelligence for an audit.
 * Pattern mirrors gatherAllIntelligence from gather-intelligence.ts.
 *
 * Timing optimization:
 *   1. Submit OnPage crawl (returns immediately)
 *   2. Execute 4 live streams in parallel (keywords, backlinks, SERP, AEO) + Moz
 *   3. Poll for OnPage completion + fetch results + PageSpeed
 */
export async function gatherAllSeoIntelligence(
  input: SeoAuditInput,
  config: GatherSeoConfig
): Promise<SeoIntelligencePackage> {
  const errors: string[] = [];

  if (!config.dataforseoLogin || !config.dataforseoPassword) {
    throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are required for SEO audits");
  }

  const dfsClient = new DataForSeoClient(config.dataforseoLogin, config.dataforseoPassword);
  const clientDomain = input.client.domain;
  const competitorDomains = input.competitors.map((c) => c.domain);

  // Build keyword list for SERP + AEO analysis
  const seedKeywords = input.seed_topics || [];

  // ──────────────────────────────────────────
  // Step 1: Submit OnPage crawl (returns immediately)
  // ──────────────────────────────────────────
  let crawlTaskId: string | undefined;
  try {
    crawlTaskId = await submitCrawlTask(dfsClient, clientDomain, input.max_crawl_pages);
    console.log(`[SEO] OnPage crawl submitted: ${crawlTaskId}`);
  } catch (err) {
    const msg = `OnPage crawl submission failed: ${err instanceof Error ? err.message : err}`;
    console.error(`[SEO] ${msg}`);
    errors.push(msg);
  }

  // ──────────────────────────────────────────
  // Step 2: Execute 4 live streams in parallel + Moz
  // ──────────────────────────────────────────
  const [keywordsResult, backlinksResult, mozResult] = await Promise.all([
    gatherKeywordsStream(dfsClient, clientDomain, competitorDomains, errors),
    gatherBacklinksStream(dfsClient, clientDomain, competitorDomains, errors),
    // Moz metrics for client
    config.mozApiKey
      ? getDomainMetrics(clientDomain, config.mozApiKey).catch((err) => {
          errors.push(`Moz metrics failed: ${err.message}`);
          return undefined;
        })
      : Promise.resolve(undefined),
  ]);

  // Merge keyword data to get top keywords for SERP + AEO
  const topKeywords = [
    ...seedKeywords,
    ...(keywordsResult.clientKeywords.ranked_keywords || [])
      .slice(0, 20)
      .map((k) => k.keyword),
  ];
  const uniqueKeywords = [...new Set(topKeywords)].slice(0, 30);

  // Build KE client if API key available
  const keClient = config.keywordsEverywhereApiKey
    ? new KeywordsEverywhereClient(config.keywordsEverywhereApiKey)
    : undefined;

  // Now run SERP + AEO + KE enrichment with the keywords we have (Phase 2b)
  const [serpResults, aeoResult, keResult] = await Promise.all([
    gatherSerpStream(dfsClient, uniqueKeywords, errors),
    gatherAeoStream(dfsClient, input.client.company_name, uniqueKeywords, errors),
    keClient
      ? gatherKeywordsEverywhereStream(
          keClient,
          uniqueKeywords,
          clientDomain,
          competitorDomains,
          errors
        )
      : Promise.resolve(undefined),
  ]);

  // ──────────────────────────────────────────
  // Step 3: Poll for OnPage completion + fetch results + PageSpeed
  // ──────────────────────────────────────────
  let onpageSummary: OnPageCrawlSummary | undefined;
  let onpagePages: OnPagePageData[] | undefined;
  let duplicateTags: DuplicateTagItem[] | undefined;
  let redirectChains: RedirectChainItem[] | undefined;
  let nonIndexable: NonIndexableItem[] | undefined;
  let microdata: MicrodataItem[] | undefined;
  let lighthouseResults: LighthouseResult[] | undefined;
  let pagespeedResults: PageSpeedResult[] | undefined;

  if (crawlTaskId) {
    try {
      await pollCrawlReady(dfsClient, crawlTaskId);
      console.log(`[SEO] OnPage crawl ready: ${crawlTaskId}`);

      // Fetch all OnPage data in parallel
      const [summary, pages, dupes, redirects, nonIdx, micro] = await Promise.all([
        getCrawlSummary(dfsClient, crawlTaskId).catch((err) => {
          errors.push(`Crawl summary failed: ${err.message}`);
          return undefined;
        }),
        getCrawlPages(dfsClient, crawlTaskId).catch((err) => {
          errors.push(`Crawl pages failed: ${err.message}`);
          return undefined;
        }),
        getDuplicateTags(dfsClient, crawlTaskId).catch((err) => {
          errors.push(`Duplicate tags failed: ${err.message}`);
          return undefined;
        }),
        getRedirectChains(dfsClient, crawlTaskId).catch((err) => {
          errors.push(`Redirect chains failed: ${err.message}`);
          return undefined;
        }),
        getNonIndexable(dfsClient, crawlTaskId).catch((err) => {
          errors.push(`Non-indexable failed: ${err.message}`);
          return undefined;
        }),
        getMicrodata(dfsClient, crawlTaskId).catch((err) => {
          errors.push(`Microdata failed: ${err.message}`);
          return undefined;
        }),
      ]);

      onpageSummary = summary;
      onpagePages = pages;
      duplicateTags = dupes;
      redirectChains = redirects;
      nonIndexable = nonIdx;

      // Supplement DataForSEO microdata with direct JSON-LD detection
      microdata = await supplementMicrodataWithJsonLd(micro, clientDomain, pages, errors);

      // Run Lighthouse on key pages (homepage + live pages with worst score)
      const keyUrls = [
        `https://${clientDomain}`,
        ...(pages || [])
          .filter((p) => p.status_code >= 200 && p.status_code < 400 && !p.is_broken && !p.is_redirect)
          .sort((a, b) => (a.onpage_score || 100) - (b.onpage_score || 100))
          .slice(0, 5)
          .map((p) => p.url),
      ];
      const uniqueUrls = [...new Set(keyUrls)].slice(0, 6);

      lighthouseResults = await getLighthouseResults(dfsClient, uniqueUrls).catch((err) => {
        errors.push(`Lighthouse failed: ${err.message}`);
        return undefined;
      });
    } catch (err) {
      const msg = `OnPage crawl polling/fetch failed: ${err instanceof Error ? err.message : err}`;
      console.error(`[SEO] ${msg}`);
      errors.push(msg);
    }
  }

  // PageSpeed Insights (supplements Lighthouse with field data)
  const pageSpeedUrls = [
    `https://${clientDomain}`,
    ...(onpagePages || []).slice(0, 5).map((p) => p.url),
  ];
  const uniquePageSpeedUrls = [...new Set(pageSpeedUrls)].slice(0, 6);

  try {
    pagespeedResults = await getPageSpeedResults(uniquePageSpeedUrls, config.pageSpeedApiKey);
    console.log(`[SEO] PageSpeed results: ${pagespeedResults.length} pages`);
  } catch (err) {
    const msg = `PageSpeed failed: ${err instanceof Error ? err.message : err}`;
    console.warn(`[SEO] ${msg}`);
    errors.push(msg);
  }

  // ──────────────────────────────────────────
  // Assemble intelligence package
  // ──────────────────────────────────────────

  // Build client intelligence
  const clientIntel: CompanySeoIntelligence = {
    company_name: input.client.company_name,
    domain: clientDomain,
    ranked_keywords: keywordsResult.clientKeywords.ranked_keywords,
    content_gap_keywords: keywordsResult.clientKeywords.content_gap_keywords,
    competitor_domains: keywordsResult.clientKeywords.competitor_domains,
    backlink_summary: backlinksResult.clientBacklinks.backlink_summary,
    backlinks: backlinksResult.clientBacklinks.backlinks,
    anchors: backlinksResult.clientBacklinks.anchors,
    referring_domains: backlinksResult.clientBacklinks.referring_domains,
    moz_metrics: mozResult || undefined,
    errors: keywordsResult.clientKeywords.errors,
  };

  // Build competitor intelligence
  const competitorIntel: CompanySeoIntelligence[] = input.competitors.map((comp) => {
    const kwData = keywordsResult.competitorKeywords.get(comp.domain);
    const blData = backlinksResult.competitorBacklinks.get(comp.domain);

    return {
      company_name: comp.company_name,
      domain: comp.domain,
      ranked_keywords: kwData?.ranked_keywords,
      backlink_summary: blData?.backlink_summary,
      moz_metrics: undefined,
      errors: kwData?.errors || [],
    };
  });

  return {
    client: clientIntel,
    competitors: competitorIntel,
    onpage_summary: onpageSummary,
    onpage_pages: onpagePages,
    duplicate_tags: duplicateTags,
    redirect_chains: redirectChains,
    non_indexable: nonIndexable,
    microdata: microdata,
    lighthouse_results: lighthouseResults,
    serp_results: serpResults,
    llm_mentions: aeoResult.llmMentions,
    llm_responses: aeoResult.llmResponses,
    pagespeed_results: pagespeedResults,
    backlink_gap: backlinksResult.backlinkGap,
    keywords_everywhere: keResult || undefined,
    gathered_at: new Date().toISOString(),
    errors,
  };
}

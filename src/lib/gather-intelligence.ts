import { CompanyInfo } from "../types/research-input";
import {
  CompanyIntelligence,
  IntelligencePackage,
  SocialMediaIntelligence,
  OrganicIntelligence,
  PaidMediaIntelligence,
} from "../types/research-intelligence";
import { scrapeLinkedInCompany, scrapeLinkedInAds, scrapeGoogleAds } from "./apify";
import { getYouTubeChannelData } from "./youtube";
import { getDomainMetrics, getKeywordRankings, getTopPages } from "./moz";
import { scrapeWebsite } from "./firecrawl";
import { getPPCKeywords, getAdHistory } from "./spyfu";
import { analyzeAdCreatives } from "./ad-analysis";

interface GatherConfig {
  anthropicApiKey: string;
  firecrawlApiKey?: string;
  mozApiKey?: string;
  apifyApiKey?: string;
  youtubeApiKey?: string;
  spyfuApiId?: string;
  spyfuApiKey?: string;
  spyfuProxyUrl?: string;
}

/**
 * Gather all intelligence for a single company across 3 parallel streams.
 */
async function gatherCompanyIntelligence(
  company: CompanyInfo,
  config: GatherConfig
): Promise<CompanyIntelligence> {
  const errors: string[] = [];

  // Stream 1: Social media (LinkedIn + YouTube)
  const socialPromise = gatherSocial(company, config).catch((err) => {
    errors.push(`Social stream failed for ${company.company_name}: ${err.message}`);
    return { linkedin: undefined, youtube: undefined } as SocialMediaIntelligence;
  });

  // Stream 2: Organic (Moz + Firecrawl)
  const organicPromise = gatherOrganic(company, config).catch((err) => {
    errors.push(`Organic stream failed for ${company.company_name}: ${err.message}`);
    return {} as OrganicIntelligence;
  });

  // Stream 3: Paid media (Apify ads + SpyFu + ad analysis)
  const paidPromise = gatherPaid(company, config).catch((err) => {
    errors.push(`Paid stream failed for ${company.company_name}: ${err.message}`);
    return {} as PaidMediaIntelligence;
  });

  const [social, organic, paid] = await Promise.all([
    socialPromise,
    organicPromise,
    paidPromise,
  ]);

  return {
    company_name: company.company_name,
    domain: company.domain,
    social,
    organic,
    paid,
    errors,
  };
}

async function gatherSocial(
  company: CompanyInfo,
  config: GatherConfig
): Promise<SocialMediaIntelligence> {
  const results: SocialMediaIntelligence = {};

  const promises: Promise<void>[] = [];

  // LinkedIn company scrape
  if (company.linkedin_handle && config.apifyApiKey) {
    promises.push(
      scrapeLinkedInCompany(company.linkedin_handle, config.apifyApiKey)
        .then((data) => {
          results.linkedin = data;
        })
        .catch((err) => {
          console.warn(`LinkedIn scrape failed for ${company.company_name}:`, err.message);
        })
    );
  }

  // YouTube channel
  if (company.youtube_channel_id && config.youtubeApiKey) {
    promises.push(
      getYouTubeChannelData(company.youtube_channel_id, config.youtubeApiKey)
        .then((data) => {
          results.youtube = data;
        })
        .catch((err) => {
          console.warn(`YouTube fetch failed for ${company.company_name}:`, err.message);
        })
    );
  }

  await Promise.allSettled(promises);
  return results;
}

async function gatherOrganic(
  company: CompanyInfo,
  config: GatherConfig
): Promise<OrganicIntelligence> {
  const results: OrganicIntelligence = {};

  const promises: Promise<void>[] = [];

  // Moz domain metrics
  if (config.mozApiKey) {
    promises.push(
      getDomainMetrics(company.domain, config.mozApiKey)
        .then((data) => {
          results.moz_metrics = data;
        })
        .catch((err) => {
          console.warn(`Moz metrics failed for ${company.domain}:`, err.message);
        })
    );

    // Moz keywords
    promises.push(
      getKeywordRankings(company.domain, config.mozApiKey)
        .then((data) => {
          results.moz_keywords = data;
        })
        .catch((err) => {
          console.warn(`Moz keywords failed for ${company.domain}:`, err.message);
        })
    );

    // Moz top pages
    promises.push(
      getTopPages(company.domain, config.mozApiKey)
        .then((data) => {
          results.moz_top_pages = data;
        })
        .catch((err) => {
          console.warn(`Moz top pages failed for ${company.domain}:`, err.message);
        })
    );
  }

  // Firecrawl website scraping
  if (config.firecrawlApiKey) {
    promises.push(
      scrapeWebsite(company.domain, config.firecrawlApiKey)
        .then((data) => {
          results.website_pages = data;
        })
        .catch((err) => {
          console.warn(`Firecrawl failed for ${company.domain}:`, err.message);
        })
    );
  }

  await Promise.allSettled(promises);
  return results;
}

async function gatherPaid(
  company: CompanyInfo,
  config: GatherConfig
): Promise<PaidMediaIntelligence> {
  const results: PaidMediaIntelligence = {};

  const promises: Promise<void>[] = [];

  // LinkedIn Ad Library
  if (config.apifyApiKey) {
    promises.push(
      scrapeLinkedInAds(company.company_name, config.apifyApiKey)
        .then((data) => {
          results.linkedin_ads = data;
        })
        .catch((err) => {
          console.warn(`LinkedIn ads failed for ${company.company_name}:`, err.message);
        })
    );

    // Google Ads Transparency
    promises.push(
      scrapeGoogleAds(company.company_name, config.apifyApiKey)
        .then((data) => {
          results.google_ads = data;
        })
        .catch((err) => {
          console.warn(`Google ads failed for ${company.company_name}:`, err.message);
        })
    );
  }

  // SpyFu PPC keywords
  if (config.spyfuApiId && config.spyfuApiKey) {
    promises.push(
      getPPCKeywords(company.domain, config.spyfuApiId, config.spyfuApiKey, config.spyfuProxyUrl)
        .then((data) => {
          results.spyfu_ppc_keywords = data;
        })
        .catch((err) => {
          console.warn(`SpyFu PPC failed for ${company.domain}:`, err.message);
        })
    );

    // SpyFu Ad History
    promises.push(
      getAdHistory(company.domain, config.spyfuApiId, config.spyfuApiKey, config.spyfuProxyUrl)
        .then((data) => {
          results.spyfu_ad_history = data;
        })
        .catch((err) => {
          console.warn(`SpyFu ad history failed for ${company.domain}:`, err.message);
        })
    );
  }

  await Promise.allSettled(promises);

  // Ad creative analysis (needs LinkedIn + Google ads data first)
  const linkedinAds = results.linkedin_ads || [];
  const googleAds = results.google_ads || [];

  if (linkedinAds.length > 0 || googleAds.length > 0) {
    try {
      results.ad_creative_analysis = await analyzeAdCreatives(
        company.company_name,
        linkedinAds,
        googleAds,
        config.anthropicApiKey
      );
    } catch (err) {
      console.warn(
        `Ad analysis failed for ${company.company_name}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return results;
}

/**
 * Gather intelligence for all companies in parallel.
 * Runs all companies simultaneously, with 3 streams per company.
 */
export async function gatherAllIntelligence(
  client: CompanyInfo,
  competitors: CompanyInfo[],
  config: GatherConfig
): Promise<IntelligencePackage> {
  const allCompanies = [client, ...competitors];

  const results = await Promise.allSettled(
    allCompanies.map((company) => gatherCompanyIntelligence(company, config))
  );

  const clientResult =
    results[0].status === "fulfilled"
      ? results[0].value
      : {
          company_name: client.company_name,
          domain: client.domain,
          social: {},
          organic: {},
          paid: {},
          errors: [`Complete failure: ${results[0].status === "rejected" ? results[0].reason : "unknown"}`],
        };

  const competitorResults = results.slice(1).map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          company_name: competitors[i].company_name,
          domain: competitors[i].domain,
          social: {},
          organic: {},
          paid: {},
          errors: [`Complete failure: ${r.status === "rejected" ? r.reason : "unknown"}`],
        }
  );

  return {
    client: clientResult,
    competitors: competitorResults,
    gathered_at: new Date().toISOString(),
  };
}

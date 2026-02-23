import Exa from "exa-js";
import { WebResearchResult } from "../types/research-intelligence";
import { CompetitorInfo } from "../types/competitive-digest-input";

interface ExaSearchOptions {
  clientName: string;
  competitorNames: string[];
  industry: string;
  solutionCategory?: string;
}

/**
 * Run targeted web research queries via Exa.ai to gather
 * market context, industry reports, and company coverage.
 */
export async function searchWebResearch(
  apiKey: string,
  options: ExaSearchOptions
): Promise<WebResearchResult[]> {
  const exa = new Exa(apiKey);
  const results: WebResearchResult[] = [];
  const currentYear = new Date().getFullYear();

  // Build query list
  const queries: string[] = [
    // Company coverage
    `"${options.clientName}" ${options.industry}`,
    // Market context
    `${options.industry} market size market overview ${currentYear}`,
    // Tech trends
    `${options.industry} trends technology innovation ${currentYear}`,
    // Competitive landscape
    `${options.solutionCategory || options.industry} competitive landscape`,
  ];

  // Add per-competitor queries
  for (const competitor of options.competitorNames) {
    queries.push(`"${competitor}" ${options.industry}`);
  }

  // Run all queries in parallel, with individual error handling
  const searchPromises = queries.map(async (query) => {
    try {
      const response = await exa.searchAndContents(query, {
        type: "auto",
        numResults: 3,
        text: {
          maxCharacters: 2000,
        },
      });

      const added = [];
      for (const result of response.results) {
        if (result.text && result.url && result.title) {
          results.push({
            title: result.title,
            url: result.url,
            content: result.text.slice(0, 2000),
            query,
          });
          added.push(result.title);
        }
      }
      console.log(`[Exa] Query "${query.slice(0, 60)}..." → ${added.length} results`);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = err?.status || err?.response?.status || "unknown";
      console.warn(
        `[Exa] Search failed for query "${query}": status=${status} message=${msg}`
      );
    }
  });

  await Promise.allSettled(searchPromises);

  console.log(
    `[Exa] Completed web research: ${results.length} results from ${queries.length} queries`
  );

  return results;
}

// --- Competitive Digest Research ---

export interface CompetitiveDigestResult {
  title: string;
  url: string;
  content: string;
  query: string;
  publishedDate?: string;
}

export interface CompetitiveDigestResearch {
  byCompetitor: Record<string, CompetitiveDigestResult[]>;
  industry: CompetitiveDigestResult[];
  queriesRun: number;
  totalResults: number;
}

interface CompetitiveDigestOptions {
  competitors: CompetitorInfo[];
  industryKeywords: string[];
  industry: string;
  lookbackDays: number;
  includeBlogPosts: boolean;
  includeSocialActivity: boolean;
  includeYoutube: boolean;
  includeIndustryNews: boolean;
}

/**
 * Run competitive intelligence research queries via Exa.ai.
 * Returns results grouped by competitor and industry.
 */
export async function searchCompetitiveDigest(
  apiKey: string,
  options: CompetitiveDigestOptions
): Promise<CompetitiveDigestResearch> {
  const exa = new Exa(apiKey);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - options.lookbackDays);
  const startPublishedDate = startDate.toISOString().slice(0, 10);

  const byCompetitor: Record<string, CompetitiveDigestResult[]> = {};
  const industry: CompetitiveDigestResult[] = [];
  let queriesRun = 0;
  let totalResults = 0;

  // Build queries per competitor
  const competitorPromises: Promise<void>[] = [];

  for (const competitor of options.competitors) {
    byCompetitor[competitor.name] = [];

    const queries: { query: string; label: string }[] = [];

    if (options.includeBlogPosts) {
      if (competitor.blog_url) {
        queries.push({
          query: `site:${competitor.domain} blog`,
          label: `${competitor.name} blog posts`,
        });
      } else {
        queries.push({
          query: `"${competitor.name}" blog`,
          label: `${competitor.name} blog posts`,
        });
      }
    }

    if (options.includeSocialActivity) {
      queries.push({
        query: `"${competitor.name}" news OR announcement OR launch`,
        label: `${competitor.name} social/mentions`,
      });
    }

    if (options.includeYoutube && competitor.social_urls?.youtube) {
      queries.push({
        query: `site:youtube.com "${competitor.name}"`,
        label: `${competitor.name} YouTube`,
      });
    }

    for (const { query, label } of queries) {
      competitorPromises.push(
        (async () => {
          try {
            queriesRun++;
            const response = await exa.searchAndContents(query, {
              type: "auto",
              numResults: 5,
              text: { maxCharacters: 1500 },
              startPublishedDate,
            });

            for (const result of response.results) {
              if (result.text && result.url && result.title) {
                byCompetitor[competitor.name].push({
                  title: result.title,
                  url: result.url,
                  content: result.text.slice(0, 1500),
                  query,
                  publishedDate: result.publishedDate || undefined,
                });
                totalResults++;
              }
            }
            console.log(
              `[Exa] ${label}: ${response.results.length} results`
            );
          } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[Exa] Failed: ${label}: ${msg}`);
          }
        })()
      );
    }
  }

  // Build industry queries
  const industryPromises: Promise<void>[] = [];

  if (options.includeIndustryNews) {
    for (const keyword of options.industryKeywords) {
      industryPromises.push(
        (async () => {
          try {
            queriesRun++;
            const response = await exa.searchAndContents(
              `"${keyword}" trends OR insights OR analysis`,
              {
                type: "auto",
                numResults: 3,
                text: { maxCharacters: 1500 },
                startPublishedDate,
              }
            );

            for (const result of response.results) {
              if (result.text && result.url && result.title) {
                industry.push({
                  title: result.title,
                  url: result.url,
                  content: result.text.slice(0, 1500),
                  query: keyword,
                  publishedDate: result.publishedDate || undefined,
                });
                totalResults++;
              }
            }
            console.log(
              `[Exa] Industry "${keyword}": ${response.results.length} results`
            );
          } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[Exa] Failed industry "${keyword}": ${msg}`);
          }
        })()
      );
    }

    // General industry news query
    industryPromises.push(
      (async () => {
        try {
          queriesRun++;
          const response = await exa.searchAndContents(
            `${options.industry} news trends`,
            {
              type: "auto",
              numResults: 5,
              text: { maxCharacters: 1500 },
              startPublishedDate,
            }
          );

          for (const result of response.results) {
            if (result.text && result.url && result.title) {
              industry.push({
                title: result.title,
                url: result.url,
                content: result.text.slice(0, 1500),
                query: `${options.industry} news trends`,
                publishedDate: result.publishedDate || undefined,
              });
              totalResults++;
            }
          }
          console.log(
            `[Exa] Industry news: ${response.results.length} results`
          );
        } catch (err: any) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Exa] Failed industry news: ${msg}`);
        }
      })()
    );
  }

  // Run all queries in parallel
  await Promise.allSettled([...competitorPromises, ...industryPromises]);

  console.log(
    `[Exa] Competitive digest: ${totalResults} results from ${queriesRun} queries`
  );

  return { byCompetitor, industry, queriesRun, totalResults };
}

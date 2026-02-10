import Exa from "exa-js";
import { WebResearchResult } from "../types/research-intelligence";

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

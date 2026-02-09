import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { ResearchInput, ResearchInputSchema } from "../src/types/research-input";
import { IntelligencePackage } from "../src/types/research-intelligence";
import {
  ResearchOutput,
  ResearchDocumentSection,
  CompetitorScore,
} from "../src/types/research-output";
import { gatherAllIntelligence } from "../src/lib/gather-intelligence";
import {
  RESEARCH_SYSTEM_PROMPT,
  buildMainSectionPrompt,
  buildCompetitiveLandscapePrompt,
  buildCompetitorDeepDivePrompt,
  buildScoringPrompt,
  MAIN_SECTION_TYPES,
  MAIN_SECTION_TITLES,
} from "../src/prompts/research";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 16384;

async function callClaude(
  client: Anthropic,
  system: string,
  user: string
): Promise<string> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });

  const response = await stream.finalMessage();

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text;
}

function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function buildTableOfContents(sections: ResearchDocumentSection[]): string {
  const lines = ["# Table of Contents", ""];
  for (const section of sections) {
    lines.push(
      `${section.section_number}. [${section.section_title}](#${section.section_title.toLowerCase().replace(/[^a-z0-9]+/g, "-")})`
    );
  }
  lines.push("");
  return lines.join("\n");
}

function assembleFullDocument(
  title: string,
  sections: ResearchDocumentSection[]
): string {
  const parts: string[] = [];

  parts.push(`# ${title}`);
  parts.push("");
  parts.push(
    `*Generated on ${new Date().toISOString().slice(0, 10)} | ${sections.length} sections | ${sections.reduce((sum, s) => sum + s.word_count, 0).toLocaleString()} words*`
  );
  parts.push("");
  parts.push(buildTableOfContents(sections));
  parts.push("---");
  parts.push("");

  for (const section of sections) {
    parts.push(section.markdown);
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  return parts.join("\n");
}

export const generateResearch = task({
  id: "generate-research",
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: ResearchInput): Promise<ResearchOutput> => {
    // Validate input
    const input = ResearchInputSchema.parse(payload);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // ═══════════════════════════════════════════════
    // Phase 1: Intelligence Gathering (parallel)
    // ═══════════════════════════════════════════════
    metadata.set("phase", "intelligence_gathering");
    metadata.set("progress", "Gathering intelligence data...");

    const gatherConfig = {
      anthropicApiKey: apiKey,
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
      mozApiKey: process.env.MOZ_API_KEY,
      apifyApiKey: process.env.APIFY_API_KEY,
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      spyfuApiId: process.env.SPYFU_API_ID,
      spyfuApiKey: process.env.SPYFU_API_KEY,
      spyfuProxyUrl: process.env.SPYFU_PROXY_URL,
      exaApiKey: process.env.EXA_API_KEY,
    };

    const intelligence: IntelligencePackage = await gatherAllIntelligence(
      input.client,
      input.competitors,
      gatherConfig,
      {
        industry: input.context.industry_description,
        solutionCategory: input.context.solution_category,
      }
    );

    // Count data source successes/failures
    const allCompanies = [intelligence.client, ...intelligence.competitors];
    const allErrors = allCompanies.flatMap((c) => c.errors);
    let sourcesSucceeded = 0;
    let sourcesFailed = 0;
    for (const company of allCompanies) {
      if (company.social.linkedin) sourcesSucceeded++;
      else sourcesFailed++;
      if (company.social.youtube) sourcesSucceeded++;
      // YouTube is optional, don't count as failure
      if (company.organic.moz_metrics) sourcesSucceeded++;
      else if (gatherConfig.mozApiKey) sourcesFailed++;
      if (company.organic.website_pages?.length) sourcesSucceeded++;
      else if (gatherConfig.firecrawlApiKey) sourcesFailed++;
      if (company.paid.spyfu_ppc_keywords?.length) sourcesSucceeded++;
      else if (gatherConfig.spyfuApiKey) sourcesFailed++;
    }

    // ═══════════════════════════════════════════════
    // Phase 2: Document Generation (sequential)
    // ═══════════════════════════════════════════════
    metadata.set("phase", "document_generation");

    const sections: ResearchDocumentSection[] = [];
    let sectionNumber = 1;
    const totalSteps =
      MAIN_SECTION_TYPES.length + 1 + input.competitors.length + 1; // main + landscape + deep-dives + scoring

    // Step 1-4: Main sections (Market Overview, Industry Dynamics, Technology, Customer Insights)
    for (const sectionType of MAIN_SECTION_TYPES) {
      metadata.set(
        "progress",
        `Generating section ${sectionNumber}/${totalSteps}: ${MAIN_SECTION_TITLES[sectionType]}`
      );

      const { system, user } = buildMainSectionPrompt(
        sectionType,
        input,
        intelligence,
        sections
      );

      const markdown = await callClaude(client, system, user);

      sections.push({
        section_number: sectionNumber,
        section_title: MAIN_SECTION_TITLES[sectionType],
        markdown,
        word_count: countWords(markdown),
      });

      sectionNumber++;
    }

    // Step 5: Competitive Landscape
    metadata.set(
      "progress",
      `Generating section ${sectionNumber}/${totalSteps}: Competitive Landscape`
    );

    const landscapePrompt = buildCompetitiveLandscapePrompt(
      input,
      intelligence,
      sections
    );
    const landscapeMarkdown = await callClaude(
      client,
      landscapePrompt.system,
      landscapePrompt.user
    );

    sections.push({
      section_number: sectionNumber,
      section_title: "Competitive Landscape",
      markdown: landscapeMarkdown,
      word_count: countWords(landscapeMarkdown),
    });
    sectionNumber++;

    // Step 6: Competitor Deep-Dives (1 call per competitor)
    for (const competitor of intelligence.competitors) {
      metadata.set(
        "progress",
        `Generating section ${sectionNumber}/${totalSteps}: ${competitor.company_name} Deep-Dive`
      );

      const deepDivePrompt = buildCompetitorDeepDivePrompt(
        competitor,
        input,
        intelligence,
        sections
      );
      const deepDiveMarkdown = await callClaude(
        client,
        deepDivePrompt.system,
        deepDivePrompt.user
      );

      sections.push({
        section_number: sectionNumber,
        section_title: `${competitor.company_name} — Competitive Deep-Dive`,
        markdown: deepDiveMarkdown,
        word_count: countWords(deepDiveMarkdown),
      });
      sectionNumber++;
    }

    // Step 7: Competitive Scoring
    metadata.set(
      "progress",
      `Generating section ${sectionNumber}/${totalSteps}: Competitive Scoring`
    );

    const scoringPrompt = buildScoringPrompt(input, intelligence, sections);
    const scoringResponse = await callClaude(
      client,
      scoringPrompt.system,
      scoringPrompt.user
    );

    const competitiveScores = extractJson(scoringResponse) as Record<
      string,
      CompetitorScore
    >;

    // Build scoring section markdown
    const scoringMarkdown = buildScoringMarkdown(competitiveScores);

    sections.push({
      section_number: sectionNumber,
      section_title: "Competitive Scoring & Analysis",
      markdown: scoringMarkdown,
      word_count: countWords(scoringMarkdown),
    });

    // ═══════════════════════════════════════════════
    // Phase 3: Assembly
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final document...");

    const title = `Marketing Research: ${input.client.company_name}`;
    const fullDocument = assembleFullDocument(title, sections);
    const totalWordCount = sections.reduce(
      (sum, s) => sum + s.word_count,
      0
    );

    // Build executive summary from first section
    const summary =
      sections[0]?.markdown.slice(0, 500).split("\n\n")[0] ||
      `Comprehensive marketing research analysis for ${input.client.company_name} across ${input.competitors.length} competitors.`;

    const output: ResearchOutput = {
      type: "research",
      title,
      summary,
      sections,
      competitive_scores: competitiveScores,
      full_document_markdown: fullDocument,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        total_word_count: totalWordCount,
        intelligence_summary: {
          companies_analyzed: allCompanies.length,
          data_sources_succeeded: sourcesSucceeded,
          data_sources_failed: sourcesFailed,
          errors: allErrors,
        },
      },
    };

    metadata.set("progress", "Complete");
    return output;
  },
});

/**
 * Build a markdown table from competitive scores.
 */
function buildScoringMarkdown(
  scores: Record<string, CompetitorScore>
): string {
  const companies = Object.keys(scores);
  const lines: string[] = [
    "## Competitive Scoring & Analysis",
    "",
    "### Scoring Matrix",
    "",
    `| Dimension | ${companies.join(" | ")} |`,
    `| --- | ${companies.map(() => "---").join(" | ")} |`,
    `| Organic SEO | ${companies.map((c) => scores[c].organic_seo).join(" | ")} |`,
    `| Social Media | ${companies.map((c) => scores[c].social_media).join(" | ")} |`,
    `| Content Strategy | ${companies.map((c) => scores[c].content_strategy).join(" | ")} |`,
    `| Paid Media | ${companies.map((c) => scores[c].paid_media).join(" | ")} |`,
    `| Brand Positioning | ${companies.map((c) => scores[c].brand_positioning).join(" | ")} |`,
    `| **Overall** | ${companies.map((c) => `**${scores[c].overall}**`).join(" | ")} |`,
    "",
    "### Score Justifications",
    "",
  ];

  for (const company of companies) {
    const score = scores[company];
    lines.push(`#### ${company}`);
    lines.push("");
    lines.push(`- **Organic SEO (${score.organic_seo}/10)**: ${score.justification.organic_seo}`);
    lines.push(`- **Social Media (${score.social_media}/10)**: ${score.justification.social_media}`);
    lines.push(`- **Content Strategy (${score.content_strategy}/10)**: ${score.justification.content_strategy}`);
    lines.push(`- **Paid Media (${score.paid_media}/10)**: ${score.justification.paid_media}`);
    lines.push(`- **Brand Positioning (${score.brand_positioning}/10)**: ${score.justification.brand_positioning}`);
    lines.push("");
  }

  return lines.join("\n");
}

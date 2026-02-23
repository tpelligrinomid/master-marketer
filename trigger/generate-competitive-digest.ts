import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import {
  CompetitiveDigestInput,
  CompetitiveDigestInputSchema,
} from "../src/types/competitive-digest-input";
import type { CompetitiveDigestOutput } from "../src/types/competitive-digest-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { searchCompetitiveDigest } from "../src/lib/exa";
import { buildCompetitiveDigestPrompt } from "../src/prompts/competitive-digest";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 16000;

export const generateCompetitiveDigest = task({
  id: "generate-competitive-digest",
  maxDuration: 900, // 15 minutes
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: CompetitiveDigestInput & {
      _callback?: TaskCallback;
      _jobId?: string;
    }
  ): Promise<CompetitiveDigestOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    const input = CompetitiveDigestInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const exaApiKey = process.env.EXA_API_KEY;
    if (!exaApiKey) {
      throw new Error("EXA_API_KEY not configured");
    }

    const lookbackDays = input.research_config?.lookback_days ?? 7;

    // Calculate period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    const period = {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    };

    // ═══════════════════════════════════════════════
    // Phase 1: Exa Research (parallel)
    // ═══════════════════════════════════════════════
    metadata.set("phase", "research");
    metadata.set(
      "progress",
      `Researching ${input.competitors.length} competitors...`
    );

    const research = await searchCompetitiveDigest(exaApiKey, {
      competitors: input.competitors,
      industryKeywords: input.industry_keywords,
      industry: input.client.industry,
      lookbackDays,
      includeBlogPosts: input.research_config?.include_blog_posts ?? true,
      includeSocialActivity: input.research_config?.include_social_activity ?? true,
      includeYoutube: input.research_config?.include_youtube ?? true,
      includeIndustryNews: input.research_config?.include_industry_news ?? true,
    });

    // ═══════════════════════════════════════════════
    // Phase 2: Claude Synthesis
    // ═══════════════════════════════════════════════
    metadata.set("phase", "synthesis");
    metadata.set(
      "progress",
      `Synthesizing ${research.totalResults} results into digest...`
    );

    const client = new Anthropic({ apiKey });
    const { system, user } = buildCompetitiveDigestPrompt(
      input,
      research,
      period
    );

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

    // Parse JSON output
    metadata.set("phase", "parsing");
    metadata.set("progress", "Parsing competitive digest...");

    const parsed = extractJson(textContent.text) as {
      title: string;
      content_body: string;
      content_structured: CompetitiveDigestOutput["content_structured"];
    };

    const output: CompetitiveDigestOutput = {
      title: parsed.title,
      period,
      content_body: parsed.content_body,
      content_structured: parsed.content_structured,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        sources_checked: research.totalResults,
        exa_queries_run: research.queriesRun,
        competitors_analyzed: input.competitors.length,
        lookback_days: lookbackDays,
      },
    };

    // Callback delivery
    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(
        _callback,
        _jobId || "unknown",
        "completed",
        output
      );
    }

    metadata.set("progress", "Complete");
    return output;
  },
});

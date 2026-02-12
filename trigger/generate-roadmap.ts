import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { RoadmapInput, RoadmapInputSchema } from "../src/types/roadmap-input";
import { GeneratedRoadmapOutput, CompetitorSnapshot } from "../src/types/roadmap-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { ROADMAP_BOILERPLATE, PROCESS_TIMELINE } from "../src/prompts/roadmap-boilerplate";
import {
  buildTargetMarketAndBrandStoryPrompt,
  buildProductsAndCompetitionPrompt,
  buildGoalsAndStrategyPrompt,
  buildAnnualAndPointsPlanPrompt,
} from "../src/prompts/roadmap";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 32000;

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

const FALLBACK_ZERO_SCORES = {
  organic_seo: 0,
  social_media: 0,
  content_strategy: 0,
  paid_media: 0,
  brand_positioning: 0,
  overall: 0,
};

export const generateRoadmap = task({
  id: "generate-roadmap",
  maxDuration: 1800, // 30 minutes — 4 calls vs research's 7+
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: RoadmapInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<GeneratedRoadmapOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    // Validate input
    const input = RoadmapInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Accumulated results from prior calls — carries forward for coherence
    const accumulated: Record<string, unknown> = {};

    // ═══════════════════════════════════════════════
    // Phase 1: Target Market + Brand Story
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_1_target_market_brand_story");
    metadata.set("progress", "Generating target market profiles and brand story...");

    const call1Prompt = buildTargetMarketAndBrandStoryPrompt(input);
    const call1Response = await callClaude(client, call1Prompt.system, call1Prompt.user);
    const call1Result = extractJson(call1Response) as {
      target_market: { profiles: unknown[] };
      brand_story: Record<string, unknown>;
    };

    accumulated.target_market = call1Result.target_market;
    accumulated.brand_story = call1Result.brand_story;

    // ═══════════════════════════════════════════════
    // Phase 2: Products & Competition
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_2_products_competition");
    metadata.set("progress", "Generating products matrix and competitive analysis...");

    const call2Prompt = buildProductsAndCompetitionPrompt(input, accumulated);
    const call2Response = await callClaude(client, call2Prompt.system, call2Prompt.user);
    const call2Result = extractJson(call2Response) as {
      products_and_solutions: { products: unknown[] };
      competition: { competitors: Array<{ company_name: string; positioning_description: string; key_observations: string[] }> };
    };

    accumulated.products_and_solutions = call2Result.products_and_solutions;
    accumulated.competition = call2Result.competition;

    // ═══════════════════════════════════════════════
    // Phase 3: Goals + Roadmap Phases + OKRs
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_3_goals_strategy");
    metadata.set("progress", "Generating goals, roadmap phases, and quarterly initiatives...");

    const call3Prompt = buildGoalsAndStrategyPrompt(input, accumulated);
    const call3Response = await callClaude(client, call3Prompt.system, call3Prompt.user);
    const call3Result = extractJson(call3Response) as {
      goals: Record<string, unknown>;
      roadmap_phases: Record<string, unknown>;
      quarterly_initiatives: Record<string, unknown>;
    };

    accumulated.goals = call3Result.goals;
    accumulated.roadmap_phases = call3Result.roadmap_phases;
    accumulated.quarterly_initiatives = call3Result.quarterly_initiatives;

    // ═══════════════════════════════════════════════
    // Phase 4: Annual Plan + Points Plan
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_4_annual_points_plan");
    metadata.set("progress", "Generating annual plan and points allocation...");

    const call4Prompt = buildAnnualAndPointsPlanPrompt(input, accumulated);
    const call4Response = await callClaude(client, call4Prompt.system, call4Prompt.user);
    const call4Result = extractJson(call4Response) as {
      annual_plan: { categories: unknown[] };
      points_plan: { total_points: number; months: unknown[] };
    };

    accumulated.annual_plan = call4Result.annual_plan;
    accumulated.points_plan = call4Result.points_plan;

    // ═══════════════════════════════════════════════
    // Assembly Phase
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final roadmap output...");

    // Merge competitive scores from research input into competition snapshots (passthrough)
    const competitorsWithScores: CompetitorSnapshot[] = call2Result.competition.competitors.map(
      (comp) => ({
        ...comp,
        scores:
          input.research.competitive_scores[comp.company_name] ||
          FALLBACK_ZERO_SCORES,
      })
    );

    const title =
      input.title || `Marketing Roadmap: ${input.client.company_name}`;

    // Build executive summary from accumulated results
    const goalsData = call3Result.goals as { outcomes?: Array<{ business_outcome: string }> };
    const outcomeNames = goalsData.outcomes?.map((o) => o.business_outcome).join(" and ") || "growth";
    const summary = `This marketing roadmap for ${input.client.company_name} outlines a strategic 90-day execution plan focused on ${outcomeNames}. Built on comprehensive marketing research and client discovery sessions, it defines target customer profiles, competitive positioning, quarterly objectives, and a detailed deliverables plan to drive measurable results.`;

    const output: GeneratedRoadmapOutput = {
      type: "roadmap",
      title,
      summary,

      overview: {
        section_description: ROADMAP_BOILERPLATE.overview,
        process_timeline: PROCESS_TIMELINE.map((step) => ({
          step: step.step,
          title: step.title,
          cadence: step.cadence,
          bullets: [...step.bullets],
        })),
        research_description: ROADMAP_BOILERPLATE.research_description,
      },

      target_market: {
        section_description: ROADMAP_BOILERPLATE.target_market,
        ...(call1Result.target_market as { profiles: GeneratedRoadmapOutput["target_market"]["profiles"] }),
      },

      brand_story: {
        section_description: ROADMAP_BOILERPLATE.brand_story,
        ...(call1Result.brand_story as Omit<GeneratedRoadmapOutput["brand_story"], "section_description">),
      },

      products_and_solutions: {
        section_description: ROADMAP_BOILERPLATE.products_and_solutions,
        ...(call2Result.products_and_solutions as { products: GeneratedRoadmapOutput["products_and_solutions"]["products"] }),
      },

      competition: {
        section_description: ROADMAP_BOILERPLATE.competition,
        competitors: competitorsWithScores,
      },

      goals: {
        section_description: ROADMAP_BOILERPLATE.goals,
        ...(call3Result.goals as Omit<GeneratedRoadmapOutput["goals"], "section_description">),
      },

      roadmap_phases: {
        section_description: ROADMAP_BOILERPLATE.roadmap_phases,
        ...(call3Result.roadmap_phases as { phases: GeneratedRoadmapOutput["roadmap_phases"]["phases"] }),
      },

      quarterly_initiatives: {
        section_description: ROADMAP_BOILERPLATE.quarterly_initiatives,
        ...(call3Result.quarterly_initiatives as { objectives: GeneratedRoadmapOutput["quarterly_initiatives"]["objectives"] }),
      },

      annual_plan: {
        section_description: ROADMAP_BOILERPLATE.annual_plan,
        ...(call4Result.annual_plan as { categories: GeneratedRoadmapOutput["annual_plan"]["categories"] }),
      },

      points_plan: {
        section_description: ROADMAP_BOILERPLATE.points_plan,
        ...(call4Result.points_plan as Omit<GeneratedRoadmapOutput["points_plan"], "section_description">),
      },

      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        research_document_title:
          input.title || `Marketing Research: ${input.client.company_name}`,
      },
    };

    // ═══════════════════════════════════════════════
    // Webhook Callback Delivery
    // ═══════════════════════════════════════════════
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

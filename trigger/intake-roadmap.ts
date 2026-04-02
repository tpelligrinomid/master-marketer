import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { DeliverableIntakeInput, DeliverableIntakeInputSchema } from "../src/types/deliverable-intake";
import { GeneratedRoadmapOutput, CompetitorSnapshot } from "../src/types/roadmap-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { ROADMAP_BOILERPLATE, PROCESS_TIMELINE } from "../src/prompts/roadmap-boilerplate";
import {
  buildRoadmapIntakePrompt_Part1,
  buildRoadmapIntakePrompt_Part2,
} from "../src/prompts/roadmap-intake";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 32000;

const FALLBACK_ZERO_SCORES = {
  organic_seo: 0,
  social_media: 0,
  content_strategy: 0,
  paid_media: 0,
  brand_positioning: 0,
  overall: 0,
};

async function callClaude(
  client: Anthropic,
  system: string,
  user: string,
  retries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes("terminated") || msg.includes("ECONNRESET") || msg.includes("socket hang up") || msg.includes("overloaded");
      if (isRetryable && attempt < retries) {
        const delay = attempt * 15_000;
        console.warn(`[IntakeRoadmap] Claude call attempt ${attempt} failed (${msg}), retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("callClaude: unreachable");
}

export const intakeRoadmap = task({
  id: "intake-roadmap",
  maxDuration: 600, // 10 minutes
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: DeliverableIntakeInput & {
      content: string;
      _callback?: TaskCallback;
      _jobId?: string;
    }
  ): Promise<GeneratedRoadmapOutput> => {
    const { _callback, _jobId, content, ...rawInput } = payload;

    const input = DeliverableIntakeInputSchema.parse({
      ...rawInput,
      content,
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    const context = input.context;

    // ═══════════════════════════════════════════════
    // Call 1: Extract sections 1-5
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_1_sections_1_5");
    metadata.set("progress", "Extracting target market, brand story, products, and competition...");

    const call1Prompt = buildRoadmapIntakePrompt_Part1(content, context);
    const call1Response = await callClaude(client, call1Prompt.system, call1Prompt.user);
    const call1Result = extractJson(call1Response) as {
      title: string;
      summary: string;
      target_market: { profiles: GeneratedRoadmapOutput["target_market"]["profiles"] };
      brand_story: Omit<GeneratedRoadmapOutput["brand_story"], "section_description">;
      products_and_solutions: { products: GeneratedRoadmapOutput["products_and_solutions"]["products"] };
      competition: { competitors: Array<{ company_name: string; positioning_description: string; scores?: GeneratedRoadmapOutput["competition"]["competitors"][0]["scores"]; key_observations: string[] }> };
    };

    // ═══════════════════════════════════════════════
    // Call 2: Extract sections 6-10
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_2_sections_6_10");
    metadata.set("progress", "Extracting goals, roadmap phases, OKRs, annual plan, and points plan...");

    const call2Prompt = buildRoadmapIntakePrompt_Part2(content, context);
    const call2Response = await callClaude(client, call2Prompt.system, call2Prompt.user);
    const call2Result = extractJson(call2Response) as {
      goals: Omit<GeneratedRoadmapOutput["goals"], "section_description">;
      roadmap_phases: { phases: GeneratedRoadmapOutput["roadmap_phases"]["phases"] };
      quarterly_initiatives: { objectives: GeneratedRoadmapOutput["quarterly_initiatives"]["objectives"] };
      annual_plan: { categories: GeneratedRoadmapOutput["annual_plan"]["categories"] };
      points_plan: Omit<GeneratedRoadmapOutput["points_plan"], "section_description">;
    };

    // ═══════════════════════════════════════════════
    // Assembly Phase — merge results + inject boilerplate
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final roadmap output...");

    // Ensure competitor scores have fallback
    const competitorsWithScores: CompetitorSnapshot[] = call1Result.competition.competitors.map(
      (comp) => ({
        company_name: comp.company_name,
        positioning_description: comp.positioning_description,
        key_observations: comp.key_observations,
        scores: comp.scores && comp.scores.overall !== undefined
          ? comp.scores
          : FALLBACK_ZERO_SCORES,
      })
    );

    const output: GeneratedRoadmapOutput = {
      type: "roadmap",
      title: call1Result.title || `Marketing Roadmap: ${context.contract_name}`,
      summary: call1Result.summary || "",

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
        ...(call1Result.products_and_solutions as { products: GeneratedRoadmapOutput["products_and_solutions"]["products"] }),
      },

      competition: {
        section_description: ROADMAP_BOILERPLATE.competition,
        competitors: competitorsWithScores,
      },

      goals: {
        section_description: ROADMAP_BOILERPLATE.goals,
        ...(call2Result.goals as Omit<GeneratedRoadmapOutput["goals"], "section_description">),
      },

      roadmap_phases: {
        section_description: ROADMAP_BOILERPLATE.roadmap_phases,
        ...(call2Result.roadmap_phases as { phases: GeneratedRoadmapOutput["roadmap_phases"]["phases"] }),
      },

      quarterly_initiatives: {
        section_description: ROADMAP_BOILERPLATE.quarterly_initiatives,
        ...(call2Result.quarterly_initiatives as { objectives: GeneratedRoadmapOutput["quarterly_initiatives"]["objectives"] }),
      },

      annual_plan: {
        section_description: ROADMAP_BOILERPLATE.annual_plan,
        ...(call2Result.annual_plan as { categories: GeneratedRoadmapOutput["annual_plan"]["categories"] }),
      },

      points_plan: {
        section_description: ROADMAP_BOILERPLATE.points_plan,
        ...(call2Result.points_plan as Omit<GeneratedRoadmapOutput["points_plan"], "section_description">),
      },

      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        research_document_title: call1Result.title || `Marketing Roadmap: ${context.contract_name}`,
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

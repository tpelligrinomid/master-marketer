import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  ProgramRoadmapInput,
  ProgramRoadmapInputSchema,
  RoadmapOption,
  sortOptionsByTier,
} from "../src/types/program-roadmap-input";
import {
  GeneratedProgramRoadmapOutput,
  ProgramRoadmapOutputSchema,
  PROGRAM_ROADMAP_SCHEMA_VERSION,
  SharedCall1Schema,
  SharedCall2Schema,
  OptionCallSchema,
  OptionCallResult,
  ExecutiveSummaryCallSchema,
  HoursPlanSchema,
  HoursPlanMonth,
  Flag,
} from "../src/types/program-roadmap-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import {
  PROGRAM_ROADMAP_BOILERPLATE,
  PROCESS_TIMELINE,
} from "../src/prompts/program-roadmap-boilerplate";
import {
  buildSharedCall1Prompt,
  buildSharedCall2Prompt,
  buildOptionPrompt,
  buildExecutiveSummaryPrompt,
  buildCapacityRepairPrompt,
} from "../src/prompts/program-roadmap";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 32000;

/** Schema-level re-asks per call, and capacity repair attempts per option. */
const MAX_SCHEMA_ATTEMPTS = 3;
const MAX_CAPACITY_REPAIRS = 2;

/** Floating-point slack when comparing allocated hours against capacity. */
const CAPACITY_EPSILON = 0.05;

const FALLBACK_ZERO_SCORES = {
  organic_seo: 0,
  social_media: 0,
  content_strategy: 0,
  paid_media: 0,
  brand_positioning: 0,
  overall: 0,
};

// ─────────────────────────────────────────────
// Claude plumbing
// ─────────────────────────────────────────────

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
      const isRetryable =
        msg.includes("terminated") ||
        msg.includes("ECONNRESET") ||
        msg.includes("socket hang up") ||
        msg.includes("overloaded");
      if (isRetryable && attempt < retries) {
        const delay = attempt * 15_000;
        console.warn(
          `[ProgramRoadmap] Claude attempt ${attempt} failed (${msg}), retrying in ${delay / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("callClaude: unreachable");
}

/**
 * Call Claude and validate the response against a schema, re-asking with the
 * validation errors when it does not conform.
 *
 * The points path casts model JSON and hopes. That was survivable when the numbers
 * were points; these sums multiply by a contract rate into a client-facing figure.
 */
async function callClaudeValidated<T extends z.ZodTypeAny>(
  client: Anthropic,
  system: string,
  user: string,
  schema: T,
  label: string
): Promise<z.infer<T>> {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt++) {
    const prompt =
      attempt === 1
        ? user
        : `${user}

---

# Your previous response failed validation

${lastError}

Return the corrected JSON object. Same schema, same content where it was valid — fix only
what the errors name. Return ONLY the JSON object.`;

    const raw = await callClaude(client, system, prompt);

    let parsed: unknown;
    try {
      parsed = extractJson(raw);
    } catch (err) {
      lastError = `Response was not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`;
      console.warn(`[ProgramRoadmap] ${label} attempt ${attempt}: ${lastError}`);
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      if (attempt > 1) {
        console.log(`[ProgramRoadmap] ${label} recovered on attempt ${attempt}`);
      }
      return result.data;
    }

    lastError = result.error.issues
      .slice(0, 20)
      .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    console.warn(
      `[ProgramRoadmap] ${label} attempt ${attempt} failed schema:\n${lastError}`
    );
  }

  throw new Error(
    `[ProgramRoadmap] ${label} failed schema validation after ${MAX_SCHEMA_ATTEMPTS} attempts:\n${lastError}`
  );
}

// ─────────────────────────────────────────────
// Arithmetic — recomputed, never trusted
// ─────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Recompute every total from the task rows.
 *
 * The model is responsible for composition, not for summing thirty rows. Taking its
 * totals on trust is how a month reads as within capacity while its rows say otherwise.
 */
function normalizeHoursPlan(
  hoursPlan: z.infer<typeof HoursPlanSchema>,
  option: RoadmapOption
): z.infer<typeof HoursPlanSchema> {
  const months = hoursPlan.months.map((month: HoursPlanMonth) => {
    const allocated = month.tasks.reduce((sum, t) => sum + t.hours, 0);
    const overhead = month.tasks
      .filter((t) => t.program === "overhead")
      .reduce((sum, t) => sum + t.hours, 0);

    return {
      ...month,
      hours_available: option.hours_available,
      hours_allocated: round2(allocated),
      overhead_hours_allocated: round2(overhead),
    };
  });

  return {
    months,
    total_hours_allocated: round2(
      months.reduce((sum, m) => sum + m.hours_allocated, 0)
    ),
    total_hours_available: round2(option.hours_available * months.length),
  };
}

function findOverCapacityMonths(
  hoursPlan: z.infer<typeof HoursPlanSchema>,
  option: RoadmapOption
): Array<{ month: number; allocated: number }> {
  return hoursPlan.months
    .filter(
      (m) => m.hours_allocated > option.hours_available + CAPACITY_EPSILON
    )
    .map((m) => ({ month: m.month, allocated: m.hours_allocated }));
}

// ─────────────────────────────────────────────
// Per-option generation with capacity repair
// ─────────────────────────────────────────────

async function generateOption(
  client: Anthropic,
  input: ProgramRoadmapInput,
  option: RoadmapOption,
  accumulated: Record<string, unknown>,
  priorOptions: Array<{ option: RoadmapOption; goals: unknown }>
): Promise<{ result: OptionCallResult; flags: Flag[]; repairs: number }> {
  const prompt = buildOptionPrompt(input, option, accumulated, priorOptions);
  const result = await callClaudeValidated(
    client,
    prompt.system,
    prompt.user,
    OptionCallSchema,
    `option:${option.option_id}`
  );

  let hoursPlan = normalizeHoursPlan(result.hours_plan, option);
  let over = findOverCapacityMonths(hoursPlan, option);
  let repairs = 0;

  while (over.length > 0 && repairs < MAX_CAPACITY_REPAIRS) {
    repairs += 1;
    metadata.set(
      "progress",
      `Repairing over-capacity month(s) for ${option.label} (attempt ${repairs})...`
    );
    console.warn(
      `[ProgramRoadmap] ${option.option_id} over capacity on month(s) ${over
        .map((o) => o.month)
        .join(", ")} — repair ${repairs}/${MAX_CAPACITY_REPAIRS}`
    );

    const repairPrompt = buildCapacityRepairPrompt(option, over, hoursPlan);
    const repaired = await callClaudeValidated(
      client,
      repairPrompt.system,
      repairPrompt.user,
      HoursPlanSchema,
      `repair:${option.option_id}`
    );

    hoursPlan = normalizeHoursPlan(repaired, option);
    over = findOverCapacityMonths(hoursPlan, option);
  }

  /**
   * Terminal state: emit with a loud flag rather than failing the job. Discarding a
   * six-call generation because one month is 0.4 hours over is worse than shipping a
   * month the strategist can see and fix in the editor.
   */
  const flags: Flag[] = over.map((o) => ({
    level: "soft" as const,
    code: "month_over_capacity",
    message: `Month ${o.month} allocates ${o.allocated.toFixed(1)} hours against ${
      option.hours_available
    } available, after ${MAX_CAPACITY_REPAIRS} repair attempts. Reduce a production row before sending.`,
    scope: "month" as const,
    severity: "review" as const,
    option_ids: [option.option_id],
  }));

  return { result: { ...result, hours_plan: hoursPlan }, flags, repairs };
}

// ─────────────────────────────────────────────
// Task
// ─────────────────────────────────────────────

export const generateProgramRoadmap = task({
  id: "generate-program-roadmap",
  // 2 shared calls + up to 3 option calls + capacity repairs + executive summary.
  maxDuration: 2700,
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 120000,
    factor: 2,
    randomize: true,
  },
  run: async (
    payload: ProgramRoadmapInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<GeneratedProgramRoadmapOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    const input = ProgramRoadmapInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    const client = new Anthropic({ apiKey });

    const accumulated: Record<string, unknown> = {};
    const documentFlags: Flag[] = [];
    let totalRepairs = 0;

    // ── Call 1: Target Market + Brand Story (shared) ──
    metadata.set("phase", "call_1_target_market_brand_story");
    metadata.set("progress", "Generating target market profiles and brand story...");

    const call1Prompt = buildSharedCall1Prompt(input);
    const call1 = await callClaudeValidated(
      client,
      call1Prompt.system,
      call1Prompt.user,
      SharedCall1Schema,
      "shared:target_market+brand_story"
    );
    accumulated.target_market = call1.target_market;
    accumulated.brand_story = call1.brand_story;

    // ── Call 2: Products + Competition (shared) ──
    metadata.set("phase", "call_2_products_competition");
    metadata.set("progress", "Generating products matrix and competitive analysis...");

    const call2Prompt = buildSharedCall2Prompt(input, accumulated);
    const call2 = await callClaudeValidated(
      client,
      call2Prompt.system,
      call2Prompt.user,
      SharedCall2Schema,
      "shared:products+competition"
    );
    accumulated.products_and_solutions = call2.products_and_solutions;
    accumulated.competition = call2.competition;

    // ── Calls 3..3+N: one per option, ascending tier ──
    const orderedOptions = sortOptionsByTier(input.roadmap_options);
    const generated: Array<{
      option: RoadmapOption;
      result: OptionCallResult;
      flags: Flag[];
    }> = [];

    for (const [index, option] of orderedOptions.entries()) {
      metadata.set("phase", `call_option_${index + 1}`);
      metadata.set(
        "progress",
        `Generating plan for ${option.label} (${index + 1} of ${orderedOptions.length})...`
      );

      const { result, flags, repairs } = await generateOption(
        client,
        input,
        option,
        accumulated,
        generated.map((g) => ({ option: g.option, goals: g.result.goals }))
      );

      totalRepairs += repairs;
      generated.push({ option, result, flags });
    }

    // ── Final call: executive summary + recommendation ──
    metadata.set("phase", "call_executive_summary");
    metadata.set("progress", "Generating executive summary and recommendation...");

    /**
     * The strategist picks the recommendation on the generation form, so this call
     * writes the rationale for a choice already made. When the id is absent — or names
     * an option that was not generated — fall back to the highest tier rather than
     * failing: the fallback chain downstream has no third step.
     */
    const validIds = new Set(generated.map((g) => g.option.option_id));
    let recommendedOptionId = input.recommended_option_id ?? "";

    if (!validIds.has(recommendedOptionId)) {
      if (recommendedOptionId) {
        documentFlags.push({
          level: "soft",
          code: "recommendation_unresolved",
          message: `recommended_option_id "${recommendedOptionId}" does not match any generated option. Defaulted to ${
            generated[generated.length - 1].option.label
          }.`,
          scope: "document",
          severity: "review",
        });
      }
      recommendedOptionId = generated[generated.length - 1].option.option_id;
    }

    const summaryPrompt = buildExecutiveSummaryPrompt(
      input,
      generated.map((g) => ({ option: g.option, goals: g.result.goals })),
      recommendedOptionId,
      accumulated
    );
    const summaryResult = await callClaudeValidated(
      client,
      summaryPrompt.system,
      summaryPrompt.user,
      ExecutiveSummaryCallSchema,
      "shared:executive_summary"
    );

    // ── Assembly ──
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final program roadmap...");

    const competitorsWithScores = call2.competition.competitors.map((comp) => ({
      ...comp,
      scores:
        input.research.competitive_scores[comp.company_name] ||
        FALLBACK_ZERO_SCORES,
    }));

    const title =
      input.title || `Marketing Roadmap: ${input.client.company_name}`;

    const output: GeneratedProgramRoadmapOutput = {
      schema: PROGRAM_ROADMAP_SCHEMA_VERSION,
      type: "program_roadmap",
      title,
      summary: summaryResult.summary,

      hourly_rate: input.hourly_rate,
      options_are_alternatives: true,
      selected_option_id: null,

      shared: {
        executive_summary: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.executive_summary,
          body: summaryResult.executive_summary.body,
          // Authoritative: the strategist's pick, or the resolved fallback above.
          recommended_option_id: recommendedOptionId,
          recommendation_rationale:
            summaryResult.executive_summary.recommendation_rationale,
        },
        overview: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.overview,
          process_timeline: PROCESS_TIMELINE.map((step) => ({
            step: step.step,
            title: step.title,
            cadence: step.cadence,
            bullets: [...step.bullets],
          })),
          research_description: PROGRAM_ROADMAP_BOILERPLATE.research_description,
        },
        target_market: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.target_market,
          ...call1.target_market,
        },
        brand_story: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.brand_story,
          ...call1.brand_story,
        },
        products_and_solutions: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.products_and_solutions,
          ...call2.products_and_solutions,
        },
        competition: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.competition,
          competitors: competitorsWithScores,
        },
      },

      options: generated.map(({ option, result, flags }) => ({
        option_id: option.option_id,
        label: option.label,
        tier: option.tier,
        programs: option.programs,
        program_allocation: option.program_allocation,
        monthly_budget: option.monthly_budget,
        technology_monthly: option.technology_monthly,
        technology_one_time: option.technology_one_time,
        total_monthly: option.total_monthly,
        hours_available: option.hours_available,
        overhead_hours: option.overhead_hours,
        program_hours: option.program_hours,

        goals: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.goals,
          ...result.goals,
        },
        roadmap_phases: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.roadmap_phases,
          ...result.roadmap_phases,
        },
        quarterly_initiatives: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.quarterly_initiatives,
          ...result.quarterly_initiatives,
        },
        annual_plan: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.annual_plan,
          ...result.annual_plan,
        },
        hours_plan: {
          section_description: PROGRAM_ROADMAP_BOILERPLATE.hours_plan,
          ...result.hours_plan,
        },
        // Month-scoped capacity flags ride on the option until the backend redistributes.
        flags,
      })),

      flags: documentFlags,

      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        research_document_title:
          input.title || `Marketing Research: ${input.client.company_name}`,
        repair_attempts: totalRepairs,
      },
    };

    // Validate the assembled document before it leaves. A malformed section here is a
    // mispriced proposal, not a rendering glitch.
    const validated = ProgramRoadmapOutputSchema.safeParse(output);
    if (!validated.success) {
      const detail = validated.error.issues
        .slice(0, 20)
        .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      throw new Error(
        `[ProgramRoadmap] Assembled document failed validation:\n${detail}`
      );
    }

    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(
        _callback,
        _jobId || "unknown",
        "completed",
        validated.data
      );
    }

    metadata.set("progress", "Complete");
    return validated.data;
  },
});

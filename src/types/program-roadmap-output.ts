import { z } from "zod";
import { ProgramSchema, TierSchema, StageSchema } from "./program-roadmap-input";

/**
 * Program Roadmap output — `schema: "program_roadmap_v1"`.
 *
 * Unlike the points path, this output is VALIDATED rather than cast. Those sums
 * multiply by a contract rate into a client-facing dollar figure, so a silently
 * malformed month is a mispriced proposal. Every per-call schema below feeds the
 * repair re-ask in trigger/generate-program-roadmap.ts.
 *
 * Spec: docs/program-roadmap-spec.md (v6)
 */

export const PROGRAM_ROADMAP_SCHEMA_VERSION = "program_roadmap_v1";

// ─────────────────────────────────────────────
// Flags — emitted empty at all four scopes so the
// backend has somewhere to write without mutating shape.
// ─────────────────────────────────────────────

export const FlagSchema = z.object({
  level: z.literal("soft"),
  code: z.string(),
  message: z.string(),
  scope: z.enum(["row", "month", "option", "document"]),
  severity: z.enum(["review", "notice"]).optional(),
  option_ids: z.array(z.string()).optional(),
});

export type Flag = z.infer<typeof FlagSchema>;

const EmptyFlags = z.array(FlagSchema).default([]);

// ─────────────────────────────────────────────
// Shared sections — generated once, describe the client
// ─────────────────────────────────────────────

const EmpathyMapSchema = z.object({
  fictional_name: z.string(),
  fictional_job_title: z.string(),
  thinks: z.string(),
  feels: z.string(),
  says: z.string(),
  does: z.string(),
  sees: z.string(),
  hears: z.string(),
  pains: z.string(),
  goals: z.string(),
});

const TargetAccountSchema = z.object({
  name: z.string(),
  description: z.string(),
  location: z.string(),
  industry: z.string(),
  revenue: z.string(),
  number_of_employees: z.string(),
  technologies: z.array(z.string()),
  key_characteristics: z.array(z.string()),
});

export const TargetMarketSchema = z.object({
  profiles: z
    .array(
      z.object({
        target_account: TargetAccountSchema,
        empathy_map: EmpathyMapSchema,
      })
    )
    .min(1),
});

export const BrandStorySchema = z.object({
  character: z.object({ want: z.string() }),
  problem: z.object({
    villain: z.string(),
    external: z.string(),
    internal: z.string(),
    philosophical: z.string(),
  }),
  guide: z.object({ empathy: z.string(), authority: z.string() }),
  plan: z.object({ process: z.string(), agreement: z.string() }),
  call_to_action: z.object({ direct: z.string(), transitional: z.string() }),
  success: z.array(z.string()),
  failure: z.array(z.string()),
  transformation: z.object({ from: z.string(), to: z.string() }),
});

export const ProductsAndSolutionsSchema = z.object({
  products: z
    .array(
      z.object({
        product: z.string(),
        helps_overcome: z.string(),
        picture_of_success: z.string(),
        helps_avoid_failure: z.string(),
      })
    )
    .min(1),
});

export const CompetitionSchema = z.object({
  competitors: z.array(
    z.object({
      company_name: z.string(),
      positioning_description: z.string(),
      key_observations: z.array(z.string()),
    })
  ),
});

// --- Per-call schemas for the two shared calls ---

export const SharedCall1Schema = z.object({
  target_market: TargetMarketSchema,
  brand_story: BrandStorySchema,
});

export const SharedCall2Schema = z.object({
  products_and_solutions: ProductsAndSolutionsSchema,
  competition: CompetitionSchema,
});

// ─────────────────────────────────────────────
// Goals — the commitment ladder
// ─────────────────────────────────────────────

export const CommitmentTypeSchema = z.enum([
  "output",
  "leading_indicator",
  "business_outcome",
]);

export type CommitmentType = z.infer<typeof CommitmentTypeSchema>;

/** What each tier is permitted to promise. Execute commits to delivery only. */
export const TIER_COMMITMENT_LADDER: Record<
  z.infer<typeof TierSchema>,
  CommitmentType[]
> = {
  execute: ["output"],
  perform: ["output", "leading_indicator"],
  grow: ["output", "leading_indicator", "business_outcome"],
};

export const GoalsSchema = z.object({
  outcomes: z
    .array(
      z.object({
        business_outcome: z.string(),
        metric: z.string(),
        description: z.string(),
        /** Benchmark comes from the shared research synthesis — identical across options. */
        benchmark: z.string(),
        annual_goal: z.string(),
        data_source: z.string(),
        commitment_type: CommitmentTypeSchema,
      })
    )
    .min(1),
  rationale: z.array(z.string()),
});

// ─────────────────────────────────────────────
// Per-option plan sections
// ─────────────────────────────────────────────

export const RoadmapPhasesSchema = z.object({
  phases: z
    .array(
      z.object({
        name: z.string(),
        timeframe: z.string(),
        theme: z.string(),
        deliverables: z.array(z.string()),
        milestone: z.string(),
      })
    )
    .min(1),
});

export const QuarterlyInitiativesSchema = z.object({
  objectives: z
    .array(
      z.object({
        objective: z.string(),
        key_results: z.array(z.string()),
      })
    )
    .min(1),
});

export const AnnualPlanSchema = z.object({
  categories: z
    .array(
      z.object({
        category: z.string(),
        initiatives: z.array(
          z.object({
            initiative: z.string(),
            description: z.string(),
            months: z.array(z.boolean()).length(12),
          })
        ),
      })
    )
    .min(1),
});

/** Row `program` includes 'overhead': coordination is planned as rows, not reserved. */
export const RowProgramSchema = z.union([ProgramSchema, z.literal("overhead")]);

export const HoursPlanTaskSchema = z.object({
  task: z.string().min(1),
  description: z.string().min(1),
  stage: StageSchema,
  service_category: z.string().min(1),
  program: RowProgramSchema,
  /**
   * Null on every generated row today: `process_library_hours` carries no id, so
   * there is nothing to echo. See the note in the v4 response — both baseline
   * flags skip null, so they cannot fire until the payload carries an id.
   */
  process_id: z.string().nullable(),
  baseline_hours: z.number().nonnegative(),
  hours: z.number().positive(),
  adjustment_reason: z.string().nullable(),
  flags: EmptyFlags,
});

export type HoursPlanTask = z.infer<typeof HoursPlanTaskSchema>;

export const HoursPlanMonthSchema = z.object({
  month: z.number().int().positive(),
  month_label: z.string(),
  hours_available: z.number().positive(),
  hours_allocated: z.number().nonnegative(),
  overhead_hours_allocated: z.number().nonnegative(),
  tasks: z.array(HoursPlanTaskSchema).min(1),
  flags: EmptyFlags,
});

export type HoursPlanMonth = z.infer<typeof HoursPlanMonthSchema>;

export const HoursPlanSchema = z.object({
  total_hours_allocated: z.number().nonnegative(),
  total_hours_available: z.number().positive(),
  months: z.array(HoursPlanMonthSchema).length(3),
});

/** What one per-option call must return. */
export const OptionCallSchema = z.object({
  goals: GoalsSchema,
  roadmap_phases: RoadmapPhasesSchema,
  quarterly_initiatives: QuarterlyInitiativesSchema,
  annual_plan: AnnualPlanSchema,
  hours_plan: HoursPlanSchema,
});

export type OptionCallResult = z.infer<typeof OptionCallSchema>;

/** What the final executive-summary call must return. */
export const ExecutiveSummaryCallSchema = z.object({
  summary: z.string().min(1),
  executive_summary: z.object({
    body: z.string().min(1),
    recommended_option_id: z.string().min(1),
    recommendation_rationale: z.string().min(1),
  }),
});

// ─────────────────────────────────────────────
// Assembled document
// ─────────────────────────────────────────────

const withSectionDescription = <T extends z.ZodRawShape>(shape: z.ZodObject<T>) =>
  shape.extend({ section_description: z.string() });

export const ProgramRoadmapOutputSchema = z.object({
  schema: z.literal(PROGRAM_ROADMAP_SCHEMA_VERSION),
  type: z.literal("program_roadmap"),
  title: z.string().min(1),
  summary: z.string().min(1),

  hourly_rate: z.number().positive(),
  options_are_alternatives: z.literal(true),
  selected_option_id: z.string().nullable(),

  shared: z.object({
    executive_summary: z.object({
      section_description: z.string(),
      body: z.string(),
      recommended_option_id: z.string(),
      recommendation_rationale: z.string(),
    }),
    overview: z.object({
      section_description: z.string(),
      process_timeline: z.array(
        z.object({
          step: z.number(),
          title: z.string(),
          cadence: z.string(),
          bullets: z.array(z.string()),
        })
      ),
      research_description: z.string(),
    }),
    target_market: withSectionDescription(TargetMarketSchema),
    brand_story: withSectionDescription(BrandStorySchema),
    products_and_solutions: withSectionDescription(ProductsAndSolutionsSchema),
    competition: z.object({
      section_description: z.string(),
      competitors: z.array(
        z.object({
          company_name: z.string(),
          positioning_description: z.string(),
          key_observations: z.array(z.string()),
          scores: z.object({
            organic_seo: z.number(),
            social_media: z.number(),
            content_strategy: z.number(),
            paid_media: z.number(),
            brand_positioning: z.number(),
            overall: z.number(),
          }),
        })
      ),
    }),
  }),

  options: z
    .array(
      z.object({
        option_id: z.string(),
        label: z.string(),
        tier: TierSchema,
        programs: z.array(ProgramSchema),
        program_allocation: z.record(z.string(), ProgramSchema),
        monthly_budget: z.number(),
        technology_monthly: z.number(),
        technology_one_time: z.number(),
        total_monthly: z.number(),
        hours_available: z.number(),
        overhead_hours: z.number(),
        program_hours: z.number(),

        /**
         * Contract framing, echoed from the generation form. Narrative-only — neither
         * affects capacity, tier, or any flag — but both have to survive onto the
         * document for the viewer and the SOW to read them.
         */
        term_months: z.number().int().positive().nullable(),
        commitment: z
          .enum(["monthly", "quarterly", "semiannual", "annual"])
          .nullable(),

        goals: withSectionDescription(GoalsSchema),
        roadmap_phases: withSectionDescription(RoadmapPhasesSchema),
        quarterly_initiatives: withSectionDescription(QuarterlyInitiativesSchema),
        annual_plan: withSectionDescription(AnnualPlanSchema),
        hours_plan: withSectionDescription(HoursPlanSchema),
        flags: EmptyFlags,
      })
    )
    .min(1)
    .max(3),

  flags: EmptyFlags,

  metadata: z.object({
    model: z.string(),
    version: z.number(),
    generated_at: z.string(),
    research_document_title: z.string(),
    repair_attempts: z.number().optional(),
  }),
});

export type GeneratedProgramRoadmapOutput = z.infer<
  typeof ProgramRoadmapOutputSchema
>;

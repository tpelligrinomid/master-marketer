import { z } from "zod";

/**
 * Program Roadmap input — hours-based, program-based, tier-based.
 *
 * Deliberately NOT an extension of RoadmapInputSchema: that schema requires
 * `points_budget`, and extending it would force the backend to send a fake one
 * purely to pass validation. The points path is untouched by anything here.
 *
 * Spec: docs/program-roadmap-spec.md (v6)
 */

// --- Competitive Scores (passthrough from research output) ---

const CompetitiveScoreSchema = z.object({
  organic_seo: z.number(),
  social_media: z.number(),
  content_strategy: z.number(),
  paid_media: z.number(),
  brand_positioning: z.number(),
  overall: z.number(),
});

// --- Shared enums ---

export const ProgramSchema = z.enum(["authority", "reach", "pursuit"]);
export const TierSchema = z.enum(["execute", "perform", "grow"]);
export const StageSchema = z.enum(["Foundation", "Execution", "Analysis"]);

export type Program = z.infer<typeof ProgramSchema>;
export type Tier = z.infer<typeof TierSchema>;
export type Stage = z.infer<typeof StageSchema>;

/**
 * Strategy & account management sits in no program's column because it is not sold
 * as one, but its library items are always sent and always emittable. Matrix
 * enforcement exempts them — see spec "Strategy & account management is in no
 * program's column".
 */
export const OVERHEAD_CATEGORY = "Strategy & account management";

/** Rolled-up categories that resolve to the overhead reserve. */
export const OVERHEAD_CATEGORY_ALIASES = [
  "strategy & account management",
  "strategy and account management",
  "strategy",
  "account management",
];

export function isOverheadCategory(serviceCategory: string): boolean {
  return OVERHEAD_CATEGORY_ALIASES.includes(serviceCategory.trim().toLowerCase());
}

// --- Process Library Entry (hours) ---

const ProcessLibraryHoursEntrySchema = z.object({
  task: z.string().min(1),
  description: z.string().min(1),
  stage: StageSchema,
  service_category: z.string().min(1),
  baseline_hours: z.number().positive(),
  /**
   * Library item id, echoed onto every generated row that draws from it.
   *
   * Resolved by exact task-name match during assembly rather than copied by the
   * model: both baseline flags skip rows with a null id, so a hallucinated or
   * mistyped id would silently disable them on the row it lands on.
   */
  process_id: z.string().nullable().optional(),
});

export type ProcessLibraryHoursEntry = z.infer<typeof ProcessLibraryHoursEntrySchema>;

// --- Roadmap Option ---

const RoadmapOptionSchema = z.object({
  option_id: z.string().min(1),
  label: z.string().min(1),
  tier: TierSchema,
  programs: z.array(ProgramSchema).min(1).max(3),

  /**
   * Category -> program, decided once by the backend from the option's `programs`
   * ordering. Row-level `program` is derived from this and echoed, never chosen
   * independently.
   */
  program_allocation: z.record(z.string(), ProgramSchema),

  monthly_budget: z.number().positive(),
  technology_monthly: z.number().nonnegative(),
  /** Setup and implementation fees, reported separately. Absent in the v6 payload block. */
  technology_one_time: z.number().nonnegative().optional().default(0),
  total_monthly: z.number().positive(),

  /** monthly_budget / hourly_rate. The plan allocates against THIS, overhead included. */
  hours_available: z.number().positive(),
  /** 9.8 — guidance for what a well-composed plan spends on coordination, not a reserve. */
  overhead_hours: z.number().nonnegative(),
  /** hours_available - overhead_hours. Guidance only; never a per-month ceiling. */
  program_hours: z.number().positive(),

  /**
   * Narrative-only context. Introduced in addendum 2, absent from the v6 payload
   * block; accepted optionally so term and renewal framing works when sent.
   */
  term_months: z.number().int().positive().optional(),
  commitment: z.enum(["monthly", "quarterly", "semiannual", "annual"]).optional(),
  notes: z.string().optional(),
});

export type RoadmapOption = z.infer<typeof RoadmapOptionSchema>;

// --- Full Program Roadmap Input ---

export const ProgramRoadmapInputSchema = z.object({
  client: z.object({
    company_name: z.string().min(1),
    domain: z.string().min(1),
  }),

  research: z.object({
    full_document_markdown: z.string().min(1),
    competitive_scores: z.record(z.string(), CompetitiveScoreSchema),
  }),

  transcripts: z.array(z.string()),

  /** Blended contract rate. One value across every option. */
  hourly_rate: z.number().positive(),

  /** 1-3 complete priced scenarios. Alternatives, never summed. */
  roadmap_options: z.array(RoadmapOptionSchema).min(1).max(3),

  /** Category eligibility per program, applied per option. */
  program_matrix: z.record(ProgramSchema, z.array(z.string())),

  /**
   * Union of items eligible across all options, plus Strategy & account management
   * carved out unconditionally so coordination rows can be emitted at all.
   */
  process_library_hours: z.array(ProcessLibraryHoursEntrySchema).min(1),

  /**
   * The strategist's pick. When present the executive summary writes the rationale
   * for a choice already made; when absent the generator selects one and it is
   * validated against the generated option_ids.
   */
  recommended_option_id: z.string().min(1).optional(),

  instructions: z.string().optional(),

  title: z.string().optional(),

  /**
   * Previous quarter's roadmap for continuity. The backend flattens the selected
   * option's sections into the flat shape before submitting, and passes nothing
   * when no option was selected.
   */
  previous_roadmap: z.object({}).passthrough().optional(),
});

export type ProgramRoadmapInput = z.infer<typeof ProgramRoadmapInputSchema>;

// --- Derived helpers ---

const TIER_ORDER: Record<Tier, number> = { execute: 1, perform: 2, grow: 3 };

/**
 * Options generate in ascending tier order, each seeing the ones before it, so the
 * accountability ladder is visible and Perform's goals can be held above Execute's.
 * The backend is expected to send them ordered; sorting defensively costs nothing
 * and removes a silent dependency on that.
 */
export function sortOptionsByTier(options: RoadmapOption[]): RoadmapOption[] {
  return [...options].sort((a, b) => {
    const delta = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    return delta !== 0 ? delta : a.monthly_budget - b.monthly_budget;
  });
}

/**
 * Library items this option may draw from: categories eligible for its sold
 * programs, plus overhead items regardless of program.
 */
export function libraryForOption(
  library: ProcessLibraryHoursEntry[],
  option: RoadmapOption,
  matrix: Partial<Record<Program, string[]>>
): ProcessLibraryHoursEntry[] {
  const eligible = new Set<string>();
  for (const program of option.programs) {
    for (const category of matrix[program] ?? []) {
      eligible.add(category.trim().toLowerCase());
    }
  }

  return library.filter(
    (item) =>
      isOverheadCategory(item.service_category) ||
      eligible.has(item.service_category.trim().toLowerCase())
  );
}

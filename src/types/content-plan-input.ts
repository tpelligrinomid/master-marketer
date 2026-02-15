import { z } from "zod";

// --- Competitive Scores (passthrough from research output) ---

const CompetitiveScoreSchema = z.object({
  organic_seo: z.number(),
  social_media: z.number(),
  content_strategy: z.number(),
  paid_media: z.number(),
  brand_positioning: z.number(),
  overall: z.number(),
});

// --- Process Library Entry (optional for content plan) ---

const ProcessLibraryEntrySchema = z.object({
  task: z.string().min(1),
  description: z.string().min(1),
  stage: z.enum(["Foundation", "Execution", "Analysis"]),
  points: z.number().positive(),
});

// --- Full Content Plan Input ---

export const ContentPlanInputSchema = z.object({
  client: z.object({
    company_name: z.string().min(1),
    domain: z.string().min(1),
  }),

  competitors: z.array(
    z.object({
      company_name: z.string().min(1),
      domain: z.string().min(1),
    })
  ).min(1).max(4),

  /** Full roadmap output (GeneratedRoadmapOutput shape) — passthrough */
  roadmap: z.object({}).passthrough(),

  /** Full SEO audit output (GeneratedSeoAuditOutput shape) — passthrough */
  seo_audit: z.object({}).passthrough(),

  research: z.object({
    full_document_markdown: z.string().min(1),
    competitive_scores: z.record(z.string(), CompetitiveScoreSchema),
  }),

  transcripts: z.array(z.string()),

  /** Process library for points-based task allocation */
  process_library: z.array(ProcessLibraryEntrySchema).optional(),

  instructions: z.string().optional(),

  title: z.string().optional(),

  /** Previous content plan output for iteration */
  previous_content_plan: z.object({}).passthrough().optional(),
});

export type ContentPlanInput = z.infer<typeof ContentPlanInputSchema>;

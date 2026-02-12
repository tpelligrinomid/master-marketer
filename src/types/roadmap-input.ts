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

// --- Process Library Entry ---

const ProcessLibraryEntrySchema = z.object({
  task: z.string().min(1),
  description: z.string().min(1),
  stage: z.enum(["Foundation", "Execution", "Analysis"]),
  points: z.number().positive(),
});

// --- Full Roadmap Input ---

export const RoadmapInputSchema = z.object({
  client: z.object({
    company_name: z.string().min(1),
    domain: z.string().min(1),
  }),

  research: z.object({
    full_document_markdown: z.string().min(1),
    competitive_scores: z.record(z.string(), CompetitiveScoreSchema),
  }),

  transcripts: z.array(z.string()),

  process_library: z.array(ProcessLibraryEntrySchema).min(1),

  points_budget: z.number().positive(),

  instructions: z.string().optional(),

  title: z.string().optional(),
});

export type RoadmapInput = z.infer<typeof RoadmapInputSchema>;

import { z } from "zod";

// --- Company Schema (used for both client and competitors) ---

const CompanySchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().min(1),
  linkedin_handle: z.string().optional(), // e.g. "company/bionomous"
  youtube_channel_id: z.string().optional(), // e.g. "UCxxxxxx"
});

export type CompanyInfo = z.infer<typeof CompanySchema>;

// --- Research Context ---

const ResearchContextSchema = z.object({
  industry_description: z.string().min(1),
  solution_category: z.string().optional(),
  target_verticals: z.array(z.string()).optional(),
});

// --- Full Research Input ---

export const ResearchInputSchema = z.object({
  client: CompanySchema,
  competitors: z.array(CompanySchema).min(1).max(4),
  context: ResearchContextSchema,
  rag_context: z.string().optional(), // meeting transcripts, discovery notes
});

export type ResearchInput = z.infer<typeof ResearchInputSchema>;

import { z } from "zod";

// --- Company Schema (used for both client and competitors) ---

const CompanySchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().min(1),
  linkedin_handle: z.string().optional(), // e.g. "company/bionomous"
  youtube_channel_id: z.string().optional(), // e.g. "UCxxxxxx"
});

export type CompanyInfo = z.infer<typeof CompanySchema>;

// --- Research Context (optional — MM can infer from knowledge_base) ---

const ResearchContextSchema = z.object({
  industry_description: z.string().min(1),
  solution_category: z.string().optional(),
  target_verticals: z.array(z.string()).optional(),
});

// --- Knowledge Base (assembled discovery data from MiD App) ---

const KnowledgeBaseSchema = z.object({
  primary_meetings: z.array(z.any()).optional(),
  other_meetings: z.array(z.any()).optional(),
  notes: z.array(z.any()).optional(),
  processes: z.array(z.any()).optional(),
});

// --- Full Research Input ---

export const ResearchInputSchema = z.object({
  client: CompanySchema,
  competitors: z.array(CompanySchema).min(1).max(4),
  context: ResearchContextSchema.optional(),
  rag_context: z.string().optional(), // legacy: meeting transcripts, discovery notes
  knowledge_base: KnowledgeBaseSchema.optional(), // structured discovery data from MiD App
  instructions: z.string().optional(), // strategist instructions for this report
  title: z.string().optional(), // custom title override
});

export type ResearchInput = z.infer<typeof ResearchInputSchema>;

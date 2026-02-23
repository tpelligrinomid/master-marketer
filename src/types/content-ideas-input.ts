import { z } from "zod";

const ClientSchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().min(1),
  industry: z.string().min(1),
  brand_voice: z.string().optional(),
});

const LibraryContentSchema = z.object({
  title: z.string(),
  content: z.string(),
  source_type: z.string(),
});

const ContextSchema = z.object({
  library_content: z.array(LibraryContentSchema).optional(),
  content_plan: z.string().optional(),
  existing_ideas: z.array(z.string()).optional(),
});

export const ContentIdeasInputSchema = z.object({
  client: ClientSchema,
  prompt: z.string().min(1),
  count: z.number().int().min(1).max(20).default(5),
  content_type: z.string().optional(),
  category: z.string().optional(),
  context: ContextSchema.optional(),
});

export type ContentIdeasInput = z.infer<typeof ContentIdeasInputSchema>;

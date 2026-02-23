import { z } from "zod";

const ClientSchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().min(1),
  industry: z.string().min(1),
  brand_voice: z.string().optional(),
});

const TemplateSchema = z.object({
  system_prompt: z.string().min(1),
  user_prompt: z.string().min(1),
  variables: z.record(z.string()).optional(),
});

const ReferenceContentSchema = z.object({
  title: z.string(),
  content: z.string(),
  content_type: z.string(),
});

const LibraryContextSchema = z.object({
  title: z.string(),
  content: z.string(),
  source_type: z.string(),
  similarity: z.number().optional(),
});

const ContextSchema = z.object({
  reference_content: z.array(ReferenceContentSchema).optional(),
  library_context: z.array(LibraryContextSchema).optional(),
  additional_instructions: z.string().optional(),
});

const OutputFormatSchema = z.object({
  format: z.string().default("markdown"),
  include_meta_description: z.boolean().default(true),
  include_social_snippets: z.boolean().default(true),
  word_count_target: z.number().optional(),
});

export const ContentPieceInputSchema = z.object({
  client: ClientSchema,
  content_type: z.string().min(1),
  template: TemplateSchema,
  context: ContextSchema.optional(),
  output_format: OutputFormatSchema.optional(),
});

export type ContentPieceInput = z.infer<typeof ContentPieceInputSchema>;

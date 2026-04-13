import { z } from "zod";

const CompanySchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().min(1),
});

const ReferenceDeliverableSchema = z.object({
  title: z.string().min(1),
  deliverable_type: z.string().min(1),
  content: z.string().min(1),
});

const ReferenceImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
});

const KnowledgeBaseSchema = z.object({
  primary_meetings: z.array(z.any()).optional(),
  other_meetings: z.array(z.any()).optional(),
  notes: z.array(z.any()).optional(),
  processes: z.array(z.any()).optional(),
});

export const BriefInputSchema = z.object({
  deliverable_type: z.literal("brief").optional(),
  contract_id: z.string().optional(),
  title: z.string().min(1),
  instructions: z.string().min(1),
  client: CompanySchema,
  reference_deliverables: z.array(ReferenceDeliverableSchema).max(5).default([]),
  reference_images: z.array(ReferenceImageSchema).max(20).default([]),
  knowledge_base: KnowledgeBaseSchema.optional(),
});

export type BriefInput = z.infer<typeof BriefInputSchema>;

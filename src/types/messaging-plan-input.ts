import { z } from "zod";

/**
 * Input schema for the Messaging Plan generator.
 *
 * Mirrors the `research` generator's markdown-first contract: MiD POSTs a
 * payload of context, MM returns 202 + jobId, generates in the background, and
 * POSTs the result to `callback_url`.
 *
 * ALL context fields are optional — generate the best plan from whatever is
 * provided. None of them block generation.
 */

const ClientSchema = z.object({
  company_name: z.string().optional(),
  domain: z.string().optional(),
});

const ResearchSchema = z.object({
  // Full text of the prior Research deliverable (competitive landscape,
  // positioning analysis, etc.).
  full_document_markdown: z.string().optional(),
  // Competitive scores object from the research deliverable (shape varies).
  competitive_scores: z.record(z.any()).optional(),
});

export const MessagingPlanInputSchema = z.object({
  deliverable_type: z.literal("messaging_plan").optional(),
  contract_id: z.string().optional(),
  title: z.string().optional(),
  instructions: z.string().optional(),

  client: ClientSchema.optional(),
  research: ResearchSchema.optional(),

  // Full content_structured object from the contract's latest roadmap
  // deliverable (if one exists). Background context only — shape varies.
  roadmap: z.record(z.any()).optional(),

  // User-selected brand-story / kickoff / planning meeting transcripts.
  transcripts: z.array(z.string()).optional(),
});

export type MessagingPlanInput = z.infer<typeof MessagingPlanInputSchema>;

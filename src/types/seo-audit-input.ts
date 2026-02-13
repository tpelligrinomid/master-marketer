import { z } from "zod";

const CompetitorSchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().min(1),
});

const CompetitiveScoreSchema = z.object({
  organic_seo: z.number(),
  social_media: z.number(),
  content_strategy: z.number(),
  paid_media: z.number(),
  brand_positioning: z.number(),
  overall: z.number(),
});

const ResearchContextSchema = z.object({
  full_document_markdown: z.string().min(1),
  competitive_scores: z.record(z.string(), CompetitiveScoreSchema),
});

export const SeoAuditInputSchema = z.object({
  client: z.object({
    company_name: z.string().min(1),
    domain: z.string().min(1),
  }),

  competitors: z.array(CompetitorSchema).min(1).max(4),

  /** Optional focus areas for keyword research */
  seed_topics: z.array(z.string()).optional(),

  /** Optional prior research output for richer context */
  research_context: ResearchContextSchema.optional(),

  /** Max pages to crawl (default 500, max 2000) */
  max_crawl_pages: z.number().min(1).max(2000).default(500),

  instructions: z.string().optional(),

  title: z.string().optional(),
});

export type SeoAuditInput = z.infer<typeof SeoAuditInputSchema>;

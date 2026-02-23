import { z } from "zod";

const ClientSchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().min(1),
  industry: z.string().min(1),
});

const SocialUrlsSchema = z.object({
  linkedin: z.string().optional(),
  youtube: z.string().optional(),
});

const CompetitorSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  blog_url: z.string().optional(),
  social_urls: SocialUrlsSchema.optional(),
});

const ResearchConfigSchema = z.object({
  lookback_days: z.number().default(7),
  include_blog_posts: z.boolean().default(true),
  include_social_activity: z.boolean().default(true),
  include_youtube: z.boolean().default(true),
  include_industry_news: z.boolean().default(true),
});

export const CompetitiveDigestInputSchema = z.object({
  client: ClientSchema,
  competitors: z.array(CompetitorSchema).min(1),
  industry_keywords: z.array(z.string()),
  research_config: ResearchConfigSchema.optional(),
});

export type CompetitiveDigestInput = z.infer<typeof CompetitiveDigestInputSchema>;
export type CompetitorInfo = z.infer<typeof CompetitorSchema>;

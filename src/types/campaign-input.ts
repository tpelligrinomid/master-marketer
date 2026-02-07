import { z } from "zod";

/**
 * Campaign Input Schema
 *
 * This is the structured input that strategists fill out to generate
 * LinkedIn ads and display/image ads for B2B technology companies.
 * Every field exists to give the LLM enough context to produce
 * audience-specific, punchy ad copy — not generic filler.
 */

// The specific people we're targeting — not broad demographics
const TargetAudienceSchema = z.object({
  // Specific job titles or roles (e.g., "VP of Engineering", "CISO", "DevOps Lead")
  job_titles: z.array(z.string()).min(1),

  // Seniority level(s)
  seniority: z.array(z.enum([
    "c_suite",
    "vp",
    "director",
    "manager",
    "individual_contributor",
  ])).min(1),

  // What keeps them up at night — the problems they're actively trying to solve
  pain_points: z.array(z.string()).min(1),

  // What would trigger them to evaluate a solution right now
  buying_triggers: z.array(z.string()).optional(),

  // Industry verticals they work in (e.g., "FinTech", "Healthcare IT", "SaaS")
  verticals: z.array(z.string()).optional(),

  // Company size of the target accounts
  company_size: z.enum([
    "startup",       // 1-50
    "smb",           // 51-200
    "mid_market",    // 201-1000
    "enterprise",    // 1000+
  ]).optional(),

  // What they care about when evaluating solutions
  decision_criteria: z.array(z.string()).optional(),

  // Existing tools/solutions they likely use (competitive context)
  current_tools: z.array(z.string()).optional(),
});

// Company and product context
const CompanyContextSchema = z.object({
  company_name: z.string().min(1),
  company_website: z.string().url().optional(),

  // One-liner: what the product does in plain language
  product_summary: z.string().min(1),

  // What makes this different from alternatives — be specific
  differentiators: z.array(z.string()).min(1),

  // Hard proof points: metrics, customer results, awards
  proof_points: z.array(z.string()).optional(),

  // Named customers or logos that can be referenced
  customer_references: z.array(z.string()).optional(),

  // Product category (e.g., "observability platform", "identity management")
  category: z.string().optional(),

  // Pricing model if relevant to the ad (e.g., "Free tier available", "Starting at $X")
  pricing_hook: z.string().optional(),
});

// Campaign strategy
const CampaignObjectivesSchema = z.object({
  // What action we want the audience to take
  primary_cta: z.string().min(1),

  // The offer or landing page content (e.g., "Free trial", "Whitepaper download", "Demo")
  offer: z.string().min(1),

  // Campaign goal
  goal: z.enum([
    "awareness",
    "lead_generation",
    "demo_requests",
    "content_download",
    "free_trial_signup",
    "event_registration",
    "retargeting",
  ]),

  // Where in the funnel is this audience?
  funnel_stage: z.enum([
    "top",       // Never heard of us
    "middle",    // Aware, evaluating
    "bottom",    // Ready to buy, need a nudge
  ]),

  // Key message or angle to lead with
  primary_message: z.string().min(1),

  // Secondary messages to weave in
  supporting_messages: z.array(z.string()).optional(),
});

// Platform and format preferences
const PlatformConfigSchema = z.object({
  // Which platforms to generate for
  platforms: z.array(z.enum([
    "linkedin",      // Sponsored content (single image, carousel, video)
    "display",       // Display/banner ads (AdRoll, GDN, programmatic)
  ])).min(1),

  // Which ad type categories to generate (maps to reference library)
  ad_types: z.array(z.enum([
    "testimonial",   // Lead with customer quote or result
    "numbers",       // Lead with a statistic or metric
    "statement",     // Bold value proposition or claim
    "comparison",    // Position against alternatives
    "pain_point",    // Lead with the problem
    "social_proof",  // Logos, customer count, trust signals
    "question",      // Open with a provocative question
    "how_to",        // Educational / solution-oriented
  ])).min(1),

  // Number of variations per ad type
  variations_per_type: z.number().int().min(1).max(5).default(3),
});

// Tone and brand voice
const ToneSchema = z.object({
  // Overall voice
  voice: z.enum([
    "professional",        // Corporate but not boring
    "conversational",      // Casual, relatable
    "authoritative",       // Expert, thought leader
    "provocative",         // Challenge assumptions
    "empathetic",          // We understand your pain
  ]).default("professional"),

  // Specific tone notes (e.g., "Avoid jargon", "Use 'you' not 'we'")
  guidelines: z.array(z.string()).optional(),

  // Words or phrases to avoid
  blacklist: z.array(z.string()).optional(),

  // Words or phrases to include
  must_include: z.array(z.string()).optional(),
});

// Full campaign input
export const CampaignInputSchema = z.object({
  // Human-readable name for this campaign
  campaign_name: z.string().min(1),

  company: CompanyContextSchema,
  audience: TargetAudienceSchema,
  objectives: CampaignObjectivesSchema,
  platform: PlatformConfigSchema,
  tone: ToneSchema.optional(),

  // Any additional context or files that have been processed
  additional_context: z.string().optional(),
});

export type CampaignInput = z.infer<typeof CampaignInputSchema>;
export type TargetAudience = z.infer<typeof TargetAudienceSchema>;
export type CompanyContext = z.infer<typeof CompanyContextSchema>;
export type CampaignObjectives = z.infer<typeof CampaignObjectivesSchema>;
export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;
export type Tone = z.infer<typeof ToneSchema>;

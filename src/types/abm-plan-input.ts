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

// --- Channel Schemas ---

const EmailChannelSchema = z.object({
  enabled: z.literal(true),
  platform: z.enum(["smartlead", "outreach", "salesloft", "apollo", "instantly", "other"]),
  platform_other: z.string().optional(),
  sending_domains: z.array(z.string().min(1)).min(1),
  daily_send_volume: z.number().positive(),
  warmup_needed: z.boolean(),
  sequences_count: z.number().positive().optional(),
});

const LinkedinAdsChannelSchema = z.object({
  enabled: z.literal(true),
  monthly_budget: z.number().positive(),
  formats: z.array(
    z.enum([
      "sponsored_content",
      "message_ads",
      "conversation_ads",
      "text_ads",
      "document_ads",
      "video_ads",
      "lead_gen_forms",
    ])
  ).min(1),
});

const DisplayAdsChannelSchema = z.object({
  enabled: z.literal(true),
  platform: z.enum(["google_display", "metadata_io", "rollworks", "terminus", "demandbase", "other"]),
  platform_other: z.string().optional(),
  monthly_budget: z.number().positive(),
  retargeting: z.boolean(),
});

const DirectMailChannelSchema = z.object({
  enabled: z.literal(true),
  provider: z.enum(["sendoso", "postal", "reachdesk", "alyce", "manual", "other"]),
  provider_other: z.string().optional(),
  budget_per_send: z.number().positive(),
});

const EventsChannelSchema = z.object({
  enabled: z.literal(true),
  types: z.array(
    z.enum([
      "webinars",
      "trade_shows",
      "field_events",
      "executive_dinners",
      "virtual_roundtables",
      "workshops",
    ])
  ).min(1),
  annual_event_count: z.number().positive(),
});

const WebsiteIntelligenceChannelSchema = z.object({
  enabled: z.literal(true),
  platform: z.enum(["factors_ai", "rb2b", "clearbit_reveal", "leadfeeder", "other"]),
  platform_other: z.string().optional(),
});

const ChannelsSchema = z
  .object({
    email: EmailChannelSchema.optional(),
    linkedin_ads: LinkedinAdsChannelSchema.optional(),
    display_ads: DisplayAdsChannelSchema.optional(),
    direct_mail: DirectMailChannelSchema.optional(),
    events: EventsChannelSchema.optional(),
    website_intelligence: WebsiteIntelligenceChannelSchema.optional(),
  })
  .refine(
    (channels) => channels.email !== undefined || channels.linkedin_ads !== undefined,
    { message: "At least one of email or linkedin_ads must be enabled" }
  );

// --- Tech Stack ---

const TechStackSchema = z.object({
  crm: z.enum(["hubspot", "salesforce", "pipedrive", "other"]),
  crm_other: z.string().optional(),
  marketing_automation: z.enum(["hubspot", "marketo", "pardot", "activecampaign", "none", "other"]).optional(),
  marketing_automation_other: z.string().optional(),
  data_enrichment: z.enum(["clay", "apollo", "zoominfo", "lusha", "clearbit", "other"]),
  data_enrichment_other: z.string().optional(),
  intent_data: z.enum(["factors_ai", "bombora", "6sense", "demandbase", "g2", "none", "other"]).optional(),
  intent_data_other: z.string().optional(),
  workflow_automation: z.enum(["n8n", "zapier", "make", "tray_io", "none", "other"]).optional(),
  workflow_automation_other: z.string().optional(),
});

// --- Target Segments ---

const TargetSegmentSchema = z.object({
  segment_name: z.string().min(1),
  description: z.string().min(1),
  estimated_account_count: z.number().positive(),
  tier: z.enum(["tier_1", "tier_2", "tier_3"]),
});

// --- Offers ---

const OfferSchema = z.object({
  offer_name: z.string().min(1),
  offer_type: z.enum([
    "assessment",
    "audit",
    "demo",
    "trial",
    "consultation",
    "report",
    "case_study",
    "webinar",
    "toolkit",
    "calculator",
    "custom",
  ]),
  funnel_stage: z.enum(["top", "middle", "bottom"]),
  description: z.string().optional(),
});

// --- Full ABM Plan Input ---

export const AbmPlanInputSchema = z.object({
  client: z.object({
    company_name: z.string().min(1),
    domain: z.string().min(1),
  }),

  /** Full roadmap output (GeneratedRoadmapOutput shape) — passthrough */
  roadmap: z.object({}).passthrough(),

  research: z.object({
    full_document_markdown: z.string().min(1),
    competitive_scores: z.record(z.string(), CompetitiveScoreSchema),
  }),

  transcripts: z.array(z.string()),

  target_segments: z.array(TargetSegmentSchema).min(1).max(6),

  offers: z.array(OfferSchema).min(1).max(8),

  channels: ChannelsSchema,

  tech_stack: TechStackSchema,

  // Program settings (all optional)
  monthly_ad_budget: z.number().positive().optional(),
  sales_follow_up_sla_hours: z.number().positive().optional(),
  launch_timeline: z.enum(["30_days", "60_days", "90_days"]).optional(),

  instructions: z.string().optional(),
  title: z.string().optional(),
});

export type AbmPlanInput = z.infer<typeof AbmPlanInputSchema>;

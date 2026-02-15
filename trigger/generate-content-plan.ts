import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { ContentPlanInput, ContentPlanInputSchema } from "../src/types/content-plan-input";
import type {
  GeneratedContentPlanOutput,
  ChannelRecommendation,
  AbmTactic,
  KpiTarget,
  Milestone,
  TechnicalSeoRecommendation,
  TopicCluster,
  FaqPaaTarget,
  SchemaRecommendation,
  AeoContentRecommendation,
  LinkBuildingTactic,
  SeoAeoKpiTarget,
  LocalSeoRecommendation,
  FlagshipProgram,
  EpisodeStructure,
} from "../src/types/content-plan-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { CONTENT_PLAN_BOILERPLATE } from "../src/prompts/content-plan-boilerplate";
import {
  buildFoundationAndMessagingPrompt,
  buildContentProgramPrompt,
  buildAmplificationAndManagementPrompt,
  buildSeoFoundationAndClustersPrompt,
  buildAeoAndAuthorityPrompt,
} from "../src/prompts/content-plan";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 32000;

async function callClaude(
  client: Anthropic,
  system: string,
  user: string
): Promise<string> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });

  const response = await stream.finalMessage();

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text;
}

export const generateContentPlan = task({
  id: "generate-content-plan",
  maxDuration: 2400, // 40 minutes — 5 Claude calls
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: ContentPlanInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<GeneratedContentPlanOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    // Validate input
    const input = ContentPlanInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Accumulated results from prior calls — carries forward for coherence
    const accumulated: Record<string, unknown> = {};

    // ═══════════════════════════════════════════════
    // Call 1: Foundation + Brand Messaging
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_1_foundation_messaging");
    metadata.set("progress", "Generating content foundation and brand messaging...");

    const call1Prompt = buildFoundationAndMessagingPrompt(input);
    const call1Response = await callClaude(client, call1Prompt.system, call1Prompt.user);
    const call1Result = extractJson(call1Response) as {
      content_mission: { statement: string; rationale: string };
      content_categories: Array<{ name: string; description: string; icp_alignment: string[]; example_topics: string[]; seo_cluster_connection: string }>;
      asset_types: Array<{ asset_type: string; cadence: string; primary_owner: string; notes: string }>;
      messaging: { one_liner: string; elevator_pitch: string; messaging_dos: string[]; messaging_donts: string[] };
    };

    accumulated.content_mission = call1Result.content_mission;
    accumulated.content_categories = call1Result.content_categories;
    accumulated.asset_types = call1Result.asset_types;
    accumulated.messaging = call1Result.messaging;

    // ═══════════════════════════════════════════════
    // Call 2: Content Program Design
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_2_content_program");
    metadata.set("progress", "Designing flagship content program...");

    const call2Prompt = buildContentProgramPrompt(input, accumulated);
    const call2Response = await callClaude(client, call2Prompt.system, call2Prompt.user);
    const call2Result = extractJson(call2Response) as {
      flagship_program: Record<string, unknown>;
      episode_structure: Record<string, unknown>;
    };

    accumulated.flagship_program = call2Result.flagship_program;
    accumulated.episode_structure = call2Result.episode_structure;

    // ═══════════════════════════════════════════════
    // Call 3: Amplification + Management + Next Steps
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_3_amplification_management");
    metadata.set("progress", "Generating amplification strategy, KPIs, and milestones...");

    const call3Prompt = buildAmplificationAndManagementPrompt(input, accumulated);
    const call3Response = await callClaude(client, call3Prompt.system, call3Prompt.user);
    const call3Result = extractJson(call3Response) as {
      owned_channels: Array<Record<string, unknown>>;
      earned_channels: Array<Record<string, unknown>>;
      paid_channels: Array<Record<string, unknown>>;
      abm_integration: Array<Record<string, unknown>>;
      kpi_targets: Array<Record<string, unknown>>;
      milestones: {
        milestones_30_day: Array<Record<string, unknown>>;
        milestones_60_day: Array<Record<string, unknown>>;
        milestones_90_day: Array<Record<string, unknown>>;
      };
    };

    accumulated.owned_channels = call3Result.owned_channels;
    accumulated.earned_channels = call3Result.earned_channels;
    accumulated.paid_channels = call3Result.paid_channels;
    accumulated.abm_integration = call3Result.abm_integration;
    accumulated.kpi_targets = call3Result.kpi_targets;
    accumulated.milestones = call3Result.milestones;

    // ═══════════════════════════════════════════════
    // Call 4: SEO/AEO Appendix Part 1 — Foundation + Topic Clusters
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_4_seo_foundation_clusters");
    metadata.set("progress", "Generating SEO foundation and topic clusters...");

    const call4Prompt = buildSeoFoundationAndClustersPrompt(input, accumulated);
    const call4Response = await callClaude(client, call4Prompt.system, call4Prompt.user);
    const call4Result = extractJson(call4Response) as {
      technical_seo_summary: string;
      technical_seo_recommendations: Array<Record<string, unknown>>;
      site_architecture_summary: string;
      keyword_strategy_summary: string;
      topic_clusters: Array<Record<string, unknown>>;
      faq_paa_targets: Array<Record<string, unknown>>;
    };

    accumulated.technical_seo_summary = call4Result.technical_seo_summary;
    accumulated.topic_clusters = call4Result.topic_clusters;

    // ═══════════════════════════════════════════════
    // Call 5: SEO/AEO Appendix Part 2 — AEO + Authority + Measurement
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_5_aeo_authority_measurement");
    metadata.set("progress", "Generating AEO strategy, link building, and SEO KPIs...");

    const call5Prompt = buildAeoAndAuthorityPrompt(input, accumulated);
    const call5Response = await callClaude(client, call5Prompt.system, call5Prompt.user);
    const call5Result = extractJson(call5Response) as {
      entity_optimization_plan: string;
      schema_recommendations: Array<Record<string, unknown>>;
      aeo_content_recommendations: Array<Record<string, unknown>>;
      link_building_tactics: Array<Record<string, unknown>>;
      seo_aeo_kpi_targets: Array<Record<string, unknown>>;
      local_seo_recommendations: Array<Record<string, unknown>>;
    };

    // ═══════════════════════════════════════════════
    // Assembly Phase
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final content plan output...");

    const roadmapData = input.roadmap as Record<string, unknown>;
    const seoAuditData = input.seo_audit as Record<string, unknown>;

    const title =
      input.title || `Content Plan: ${input.client.company_name}`;

    // Build summary from accumulated data
    const categoryNames = call1Result.content_categories.map((c) => c.name).join(", ");
    const programName = (call2Result.flagship_program as { program_name?: string }).program_name || "flagship content program";
    const summary = `This content plan for ${input.client.company_name} defines a comprehensive content strategy anchored by "${programName}" — a flagship content program built on ${call1Result.content_categories.length} content categories (${categoryNames}). It synthesizes the marketing roadmap and SEO audit into an actionable program with topic clusters, channel strategy, and 30/60/90-day milestones.`;

    const output: GeneratedContentPlanOutput = {
      type: "content_plan",
      title,
      summary,

      overview: {
        section_description: CONTENT_PLAN_BOILERPLATE.overview,
        engagement_summary: {
          client: input.client.company_name,
          industry: extractIndustry(roadmapData),
          engagement_start_date: new Date().toISOString().split("T")[0],
          content_plan_delivery_date: new Date().toISOString().split("T")[0],
          first_content_launch_target: getDateWeeksFromNow(10),
        },
      },

      foundation: {
        section_description: CONTENT_PLAN_BOILERPLATE.foundation,
        content_mission: call1Result.content_mission,
        content_categories: call1Result.content_categories,
        asset_types: call1Result.asset_types,
        content_attributes_description: CONTENT_PLAN_BOILERPLATE.content_attributes,
        content_brief_description: CONTENT_PLAN_BOILERPLATE.content_brief,
        content_intelligence_description: CONTENT_PLAN_BOILERPLATE.content_intelligence,
      },

      brand_positioning: {
        section_description: CONTENT_PLAN_BOILERPLATE.brand_positioning,
        storybrand_methodology_description: CONTENT_PLAN_BOILERPLATE.storybrand_methodology,
        messaging: call1Result.messaging,
      },

      content_program: {
        section_description: CONTENT_PLAN_BOILERPLATE.content_program,
        flagship_program: call2Result.flagship_program as unknown as FlagshipProgram,
        episode_structure: call2Result.episode_structure as unknown as EpisodeStructure,
      },

      content_workflow: {
        section_description: CONTENT_PLAN_BOILERPLATE.content_workflow,
        three_phase_workflow_description: CONTENT_PLAN_BOILERPLATE.three_phase_workflow,
        production_process_description: CONTENT_PLAN_BOILERPLATE.production_process,
        raci_description: CONTENT_PLAN_BOILERPLATE.raci_matrix,
      },

      content_amplification: {
        section_description: CONTENT_PLAN_BOILERPLATE.content_amplification,
        owned_channels: call3Result.owned_channels as unknown as ChannelRecommendation[],
        earned_channels: call3Result.earned_channels as unknown as ChannelRecommendation[],
        paid_channels: call3Result.paid_channels as unknown as ChannelRecommendation[],
        abm_integration: call3Result.abm_integration as unknown as AbmTactic[],
      },

      ongoing_management: {
        section_description: CONTENT_PLAN_BOILERPLATE.ongoing_management,
        monthly_review_description: CONTENT_PLAN_BOILERPLATE.monthly_review,
        quarterly_audit_description: CONTENT_PLAN_BOILERPLATE.quarterly_audit,
        refresh_retirement_description: CONTENT_PLAN_BOILERPLATE.refresh_retirement,
        kpi_targets: call3Result.kpi_targets as unknown as KpiTarget[],
      },

      next_steps: {
        section_description: CONTENT_PLAN_BOILERPLATE.next_steps,
        onboarding_checklist_description: CONTENT_PLAN_BOILERPLATE.onboarding_checklist,
        milestones_30_day: call3Result.milestones.milestones_30_day as unknown as Milestone[],
        milestones_60_day: call3Result.milestones.milestones_60_day as unknown as Milestone[],
        milestones_90_day: call3Result.milestones.milestones_90_day as unknown as Milestone[],
      },

      seo_aeo_appendix: {
        section_description: CONTENT_PLAN_BOILERPLATE.seo_aeo_appendix,
        aeo_seo_intro_description: CONTENT_PLAN_BOILERPLATE.aeo_seo_intro,
        content_structure_description: CONTENT_PLAN_BOILERPLATE.content_structure_guidelines,
        snippet_optimization_description: CONTENT_PLAN_BOILERPLATE.snippet_optimization,
        video_podcast_seo_description: CONTENT_PLAN_BOILERPLATE.video_podcast_seo,
        measurement_description: CONTENT_PLAN_BOILERPLATE.measurement_templates,
        ongoing_management_description: CONTENT_PLAN_BOILERPLATE.ongoing_seo_management,

        technical_seo_summary: call4Result.technical_seo_summary,
        technical_seo_recommendations: call4Result.technical_seo_recommendations as unknown as TechnicalSeoRecommendation[],
        site_architecture_summary: call4Result.site_architecture_summary,
        keyword_strategy_summary: call4Result.keyword_strategy_summary,
        topic_clusters: call4Result.topic_clusters as unknown as TopicCluster[],
        faq_paa_targets: call4Result.faq_paa_targets as unknown as FaqPaaTarget[],

        entity_optimization_plan: call5Result.entity_optimization_plan,
        schema_recommendations: call5Result.schema_recommendations as unknown as SchemaRecommendation[],
        aeo_content_recommendations: call5Result.aeo_content_recommendations as unknown as AeoContentRecommendation[],
        link_building_tactics: call5Result.link_building_tactics as unknown as LinkBuildingTactic[],
        seo_aeo_kpi_targets: call5Result.seo_aeo_kpi_targets as unknown as SeoAeoKpiTarget[],
        local_seo_recommendations: call5Result.local_seo_recommendations.length > 0
          ? call5Result.local_seo_recommendations as unknown as LocalSeoRecommendation[]
          : undefined,
      },

      metadata: {
        model: MODEL,
        version: extractPreviousVersion(input.previous_content_plan as Record<string, unknown> | undefined) + 1,
        generated_at: new Date().toISOString(),
        roadmap_title: (roadmapData.title as string) || `Marketing Roadmap: ${input.client.company_name}`,
        seo_audit_title: (seoAuditData.title as string) || `SEO/AEO Audit: ${input.client.company_name}`,
      },
    };

    // ═══════════════════════════════════════════════
    // Webhook Callback Delivery
    // ═══════════════════════════════════════════════
    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(
        _callback,
        _jobId || "unknown",
        "completed",
        output
      );
    }

    metadata.set("progress", "Complete");
    return output;
  },
});

// --- Helper Functions ---

/**
 * Extract industry from roadmap target_market data.
 */
function extractIndustry(roadmap: Record<string, unknown>): string {
  try {
    const targetMarket = roadmap.target_market as { profiles?: Array<{ target_account?: { industry?: string } }> } | undefined;
    if (targetMarket?.profiles?.[0]?.target_account?.industry) {
      return targetMarket.profiles[0].target_account.industry;
    }
  } catch {
    // Fall through
  }
  return "B2B";
}

/**
 * Get a date N weeks from now, formatted as YYYY-MM-DD.
 */
function getDateWeeksFromNow(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split("T")[0];
}

/**
 * Extract the version number from a previous content plan output.
 * Returns 0 if no previous plan exists (so version starts at 1).
 */
function extractPreviousVersion(
  previousPlan: Record<string, unknown> | undefined
): number {
  if (!previousPlan) return 0;
  try {
    const metadata = previousPlan.metadata as { version?: number } | undefined;
    return metadata?.version ?? 0;
  } catch {
    return 0;
  }
}

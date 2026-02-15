// ─────────────────────────────────────────────
// Section 1: Overview
// ─────────────────────────────────────────────

export interface ContentPlanOverview {
  section_description: string;
  engagement_summary: {
    client: string;
    industry: string;
    engagement_start_date: string;
    content_plan_delivery_date: string;
    first_content_launch_target: string;
  };
}

// ─────────────────────────────────────────────
// Section 2: Foundation
// ─────────────────────────────────────────────

export interface ContentMissionStatement {
  statement: string;
  rationale: string;
}

export interface ContentCategory {
  name: string;
  description: string;
  icp_alignment: string[];
  example_topics: string[];
  seo_cluster_connection: string;
}

export interface AssetTypeSelection {
  asset_type: string;
  cadence: string;
  primary_owner: string;
  notes: string;
}

export interface FoundationSection {
  section_description: string;
  content_mission: ContentMissionStatement;
  content_categories: ContentCategory[];
  asset_types: AssetTypeSelection[];
  /** Boilerplate — content attributes/buying stages table */
  content_attributes_description: string;
  /** Boilerplate — content brief template */
  content_brief_description: string;
  /** Boilerplate — content intelligence infrastructure */
  content_intelligence_description: string;
}

// ─────────────────────────────────────────────
// Section 3: Brand Positioning & Messaging
// ─────────────────────────────────────────────

export interface MessagingGuidelines {
  one_liner: string;
  elevator_pitch: string;
  messaging_dos: string[];
  messaging_donts: string[];
}

export interface BrandPositioningSection {
  section_description: string;
  /** Boilerplate — StoryBrand methodology description */
  storybrand_methodology_description: string;
  messaging: MessagingGuidelines;
}

// ─────────────────────────────────────────────
// Section 4: Content Program
// ─────────────────────────────────────────────

export interface FlagshipProgram {
  program_name: string;
  theme_statement: string;
  format: string;
  episode_cadence: string;
  episode_length: string;
  host_name: string;
  host_title: string;
  target_icps: string[];
  content_categories_covered: string[];
  primary_distribution_channels: string[];
  derivative_assets_per_episode: string[];
}

export interface EpisodeSegment {
  name: string;
  purpose: string;
  duration: string;
}

export interface EpisodeStructure {
  segments: EpisodeSegment[];
  intro_script_template: string;
  outro_script_template: string;
}

export interface ContentProgramSection {
  section_description: string;
  flagship_program: FlagshipProgram;
  episode_structure: EpisodeStructure;
}

// ─────────────────────────────────────────────
// Section 5: Content Workflow & Production
// ─────────────────────────────────────────────

export interface ContentWorkflowSection {
  section_description: string;
  /** Boilerplate — 3-phase workflow (Capture → Produce → Connect) */
  three_phase_workflow_description: string;
  /** Boilerplate — 12-step production process */
  production_process_description: string;
  /** Boilerplate — RACI matrix */
  raci_description: string;
}

// ─────────────────────────────────────────────
// Section 6: Content Amplification
// ─────────────────────────────────────────────

export interface ChannelRecommendation {
  channel: string;
  tactics: string[];
  cadence: string;
  priority: "high" | "medium" | "low";
  rationale: string;
}

export interface AbmTactic {
  activity: string;
  content_integration: string;
}

export interface ContentAmplificationSection {
  section_description: string;
  owned_channels: ChannelRecommendation[];
  earned_channels: ChannelRecommendation[];
  paid_channels: ChannelRecommendation[];
  abm_integration: AbmTactic[];
}

// ─────────────────────────────────────────────
// Section 7: Ongoing Management & Optimization
// ─────────────────────────────────────────────

export interface KpiTarget {
  metric: string;
  goal: string;
  data_source: string;
  review_cadence: string;
}

export interface OngoingManagementSection {
  section_description: string;
  /** Boilerplate — monthly review cycle */
  monthly_review_description: string;
  /** Boilerplate — quarterly audit checklist */
  quarterly_audit_description: string;
  /** Boilerplate — refresh/retirement criteria */
  refresh_retirement_description: string;
  kpi_targets: KpiTarget[];
}

// ─────────────────────────────────────────────
// Section 8: Next Steps & Action Items
// ─────────────────────────────────────────────

export interface Milestone {
  milestone: string;
  target: string;
  category: "foundation" | "build" | "launch";
}

export interface NextStepsSection {
  section_description: string;
  /** Boilerplate — onboarding checklist */
  onboarding_checklist_description: string;
  milestones_30_day: Milestone[];
  milestones_60_day: Milestone[];
  milestones_90_day: Milestone[];
}

// ─────────────────────────────────────────────
// Appendix: SEO/AEO Strategy
// ─────────────────────────────────────────────

export interface TechnicalSeoRecommendation {
  area: string;
  current_status: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
}

export interface ClusterSubtopic {
  subtopic: string;
  target_keyword: string;
  search_volume: number;
  intent: string;
  content_type: string;
}

export interface TopicCluster {
  content_category: string;
  pillar_page_topic: string;
  primary_keyword: string;
  search_volume: number;
  cluster_subtopics: ClusterSubtopic[];
}

export interface FaqPaaTarget {
  question: string;
  source: string;
  target_page: string;
  priority: "high" | "medium" | "low";
}

export interface SchemaRecommendation {
  schema_type: string;
  where_to_apply: string;
  implementation_notes: string;
  priority: "high" | "medium" | "low";
}

export interface AeoContentRecommendation {
  tactic: string;
  description: string;
  target_queries: string[];
  expected_impact: string;
}

export interface LinkBuildingTactic {
  tactic: string;
  description: string;
  expected_links_per_quarter: number;
  priority: "high" | "medium" | "low";
}

export interface SeoAeoKpiTarget {
  metric: string;
  goal: string;
  data_source: string;
  review_cadence: string;
}

export interface LocalSeoRecommendation {
  area: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
}

export interface SeoAeoAppendix {
  section_description: string;
  /** Boilerplate — A.1 introduction to AEO/SEO */
  aeo_seo_intro_description: string;
  /** Boilerplate — content structure guidelines */
  content_structure_description: string;
  /** Boilerplate — snippet optimization */
  snippet_optimization_description: string;
  /** Boilerplate — video/podcast SEO */
  video_podcast_seo_description: string;
  /** Boilerplate — measurement templates */
  measurement_description: string;
  /** Boilerplate — ongoing management */
  ongoing_management_description: string;

  // Generated content
  technical_seo_summary: string;
  technical_seo_recommendations: TechnicalSeoRecommendation[];
  site_architecture_summary: string;
  keyword_strategy_summary: string;
  topic_clusters: TopicCluster[];
  faq_paa_targets: FaqPaaTarget[];
  entity_optimization_plan: string;
  schema_recommendations: SchemaRecommendation[];
  aeo_content_recommendations: AeoContentRecommendation[];
  link_building_tactics: LinkBuildingTactic[];
  seo_aeo_kpi_targets: SeoAeoKpiTarget[];
  local_seo_recommendations?: LocalSeoRecommendation[];
}

// ═════════════════════════════════════════════
// FULL OUTPUT SCHEMA
// ═════════════════════════════════════════════

export interface GeneratedContentPlanOutput {
  type: "content_plan";
  title: string;
  summary: string;

  overview: ContentPlanOverview;
  foundation: FoundationSection;
  brand_positioning: BrandPositioningSection;
  content_program: ContentProgramSection;
  content_workflow: ContentWorkflowSection;
  content_amplification: ContentAmplificationSection;
  ongoing_management: OngoingManagementSection;
  next_steps: NextStepsSection;
  seo_aeo_appendix: SeoAeoAppendix;

  metadata: {
    model: string;
    version: number;
    generated_at: string;
    roadmap_title: string;
    seo_audit_title: string;
  };
}

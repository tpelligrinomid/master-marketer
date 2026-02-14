// ─────────────────────────────────────────────
// Section 1: Technical SEO Assessment
// ─────────────────────────────────────────────

export interface CriticalIssue {
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  affected_pages: number;
  description: string;
  recommendation: string;
}

export interface SchemaInventoryItem {
  schema_type: string;
  pages_count: number;
  status: "implemented" | "missing" | "incomplete";
  recommendation?: string;
}

export interface CoreWebVitals {
  url: string;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  inp: number | null;
  performance_score: number | null;
  rating: "good" | "needs_improvement" | "poor";
}

export interface TechnicalSeoSection {
  section_description: string;
  health_score: number;
  pages_crawled: number;
  critical_issues: CriticalIssue[];
  schema_inventory: SchemaInventoryItem[];
  core_web_vitals: CoreWebVitals[];
  crawlability_summary: string;
  indexability_summary: string;
  mobile_readiness_summary: string;
  /** The key directional decision: fix technical debt first, or proceed to content? */
  technical_verdict: {
    recommendation: "proceed_to_content" | "technical_audit_first" | "parallel_workstreams";
    rationale: string;
    /** If technical_audit_first or parallel, what specific areas need deeper investigation */
    deep_audit_areas?: string[];
  };
}

// ─────────────────────────────────────────────
// Section 2: Keyword Landscape
// ─────────────────────────────────────────────

export interface KeywordCluster {
  cluster_name: string;
  intent: string;
  business_relevance: "core" | "adjacent" | "vanity";
  relevance_rationale: string;
  keywords: Array<{
    keyword: string;
    position: number;
    search_volume: number;
    difficulty?: number;
    url?: string;
  }>;
  total_traffic_potential: number;
  opportunity_score: number;
}

export interface TopPerformer {
  keyword: string;
  position: number;
  search_volume: number;
  url: string;
  trend: "rising" | "stable" | "declining";
  business_relevance: "core" | "adjacent" | "vanity";
}

export interface KeywordLandscapeSection {
  section_description: string;
  total_ranked_keywords: number;
  top_3_keywords: number;
  top_10_keywords: number;
  top_50_keywords: number;
  estimated_organic_traffic: number;
  keyword_clusters: KeywordCluster[];
  top_performers: TopPerformer[];
  ranking_distribution_summary: string;
}

// ─────────────────────────────────────────────
// Section 3: Content Gap Analysis
// ─────────────────────────────────────────────

export interface ContentGapOpportunity {
  keyword: string;
  search_volume: number;
  difficulty?: number;
  intent: string;
  competitor_positions: Record<string, number>;
  estimated_traffic_value: number;
  priority: "high" | "medium" | "low";
  rationale: string;
}

export interface ContentGapSection {
  section_description: string;
  total_gap_keywords: number;
  high_value_gaps: ContentGapOpportunity[];
  quick_wins: ContentGapOpportunity[];
  strategic_gaps: ContentGapOpportunity[];
  gap_analysis_summary: string;
}

// ─────────────────────────────────────────────
// Section 4: SERP Features & AEO Analysis
// ─────────────────────────────────────────────

export interface SnippetOpportunity {
  keyword: string;
  search_volume: number;
  current_snippet_holder?: string;
  client_position?: number;
  snippet_type: string;
  optimization_recommendation: string;
}

export interface PaaOpportunity {
  question: string;
  parent_keyword: string;
  search_volume?: number;
  currently_answered_by?: string;
}

export interface AiOverviewPresence {
  keyword: string;
  ai_overview_present: boolean;
  client_referenced: boolean;
  competitors_referenced: string[];
  optimization_opportunity: string;
}

export interface LlmVisibility {
  engine: string;
  queries_tested: number;
  brand_mentioned_count: number;
  mention_rate: number;
  competitors_mentioned: Record<string, number>;
  key_findings: string[];
}

export interface SerpFeaturesAeoSection {
  section_description: string;
  snippet_opportunities: SnippetOpportunity[];
  paa_opportunities: PaaOpportunity[];
  ai_overview_presence: AiOverviewPresence[];
  llm_visibility: LlmVisibility[];
  serp_features_summary: string;
  aeo_readiness_score: number;
  aeo_recommendations: string[];
}

// ─────────────────────────────────────────────
// Section 5: Backlink Profile
// ─────────────────────────────────────────────

export interface AnchorDistribution {
  category: string;
  percentage: number;
  examples: string[];
}

export interface CompetitorBacklinkComparison {
  company_name: string;
  domain: string;
  total_backlinks: number;
  referring_domains: number;
  domain_rank?: number;
  dofollow_ratio: number;
}

export interface BacklinkGapOpportunity {
  referring_domain: string;
  domain_rank?: number;
  links_to_competitors: string[];
  acquisition_difficulty: "easy" | "medium" | "hard";
  recommendation: string;
}

export interface BacklinkProfileSection {
  section_description: string;
  total_backlinks: number;
  referring_domains: number;
  dofollow_ratio: number;
  domain_authority?: number;
  spam_score?: number;
  anchor_distribution: AnchorDistribution[];
  competitor_comparison: CompetitorBacklinkComparison[];
  gap_opportunities: BacklinkGapOpportunity[];
  backlink_health_summary: string;
  link_building_priorities: string[];
}

// ─────────────────────────────────────────────
// Section 6: Competitive Search Landscape
// ─────────────────────────────────────────────

export interface SearchProfile {
  company_name: string;
  domain: string;
  total_ranked_keywords: number;
  top_10_keywords: number;
  estimated_traffic: number;
  domain_authority?: number;
  top_content_categories: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitiveSearchSection {
  section_description: string;
  client_profile: SearchProfile;
  competitor_profiles: SearchProfile[];
  competitive_positioning_summary: string;
  differentiation_opportunities: string[];
}

// ─────────────────────────────────────────────
// Section 7: Strategic Recommendations
// ─────────────────────────────────────────────

export interface StrategicRecommendation {
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  timeframe: string;
  category: "technical" | "content" | "backlinks" | "aeo" | "competitive";
  kpi: string;
}

export interface StrategicRecommendationsSection {
  section_description: string;
  quick_wins: StrategicRecommendation[];
  medium_term: StrategicRecommendation[];
  long_term: StrategicRecommendation[];
  executive_summary: string;
}

// ═════════════════════════════════════════════
// FULL OUTPUT SCHEMA
// ═════════════════════════════════════════════

export interface GeneratedSeoAuditOutput {
  type: "seo_audit";
  title: string;
  summary: string;

  technical_seo: TechnicalSeoSection;
  keyword_landscape: KeywordLandscapeSection;
  content_gap: ContentGapSection;
  serp_features_aeo: SerpFeaturesAeoSection;
  backlink_profile: BacklinkProfileSection;
  competitive_search: CompetitiveSearchSection;
  strategic_recommendations: StrategicRecommendationsSection;

  metadata: {
    model: string;
    version: number;
    generated_at: string;
    domain_audited: string;
    competitors_analyzed: string[];
    intelligence_errors: string[];
  };
}

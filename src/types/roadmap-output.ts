// ─────────────────────────────────────────────
// Section 1: Overview
// ─────────────────────────────────────────────

export interface ProcessTimelineStep {
  step: number;
  title: string;
  cadence: string;
  bullets: string[];
}

export interface RoadmapOverview {
  section_description: string;
  process_timeline: ProcessTimelineStep[];
  research_description: string;
}

// ─────────────────────────────────────────────
// Section 2: Target Market — ICPs + Empathy Maps
// ─────────────────────────────────────────────

export interface IdealTargetAccount {
  name: string;
  description: string;
  location: string;
  industry: string;
  revenue: string;
  number_of_employees: string;
  technologies: string[];
  key_characteristics: string[];
}

export interface EmpathyMap {
  fictional_name: string;
  fictional_job_title: string;
  thinks: string;
  feels: string;
  says: string;
  does: string;
  sees: string;
  hears: string;
  pains: string;
  goals: string;
}

export interface IdealCustomerProfile {
  target_account: IdealTargetAccount;
  empathy_map: EmpathyMap;
}

export interface TargetMarketSection {
  section_description: string;
  profiles: IdealCustomerProfile[];
}

// ─────────────────────────────────────────────
// Section 3: Brand Positioning & Messaging (StoryBrand)
// ─────────────────────────────────────────────

export interface BrandStory {
  section_description: string;
  character: {
    want: string;
  };
  problem: {
    villain: string;
    external: string;
    internal: string;
    philosophical: string;
  };
  guide: {
    empathy: string;
    authority: string;
  };
  plan: {
    process: string;
    agreement: string;
  };
  call_to_action: {
    direct: string;
    transitional: string;
  };
  success: string[];
  failure: string[];
  transformation: {
    from: string;
    to: string;
  };
}

// ─────────────────────────────────────────────
// Section 4: Products & Solutions Matrix
// ─────────────────────────────────────────────

export interface ProductSolution {
  product: string;
  helps_overcome: string;
  picture_of_success: string;
  helps_avoid_failure: string;
}

export interface ProductsAndSolutions {
  section_description: string;
  products: ProductSolution[];
}

// ─────────────────────────────────────────────
// Section 5: Competition
// ─────────────────────────────────────────────

export interface CompetitorScores {
  organic_seo: number;
  social_media: number;
  content_strategy: number;
  paid_media: number;
  brand_positioning: number;
  overall: number;
}

export interface CompetitorSnapshot {
  company_name: string;
  positioning_description: string;
  scores: CompetitorScores;
  key_observations: string[];
}

export interface CompetitionSection {
  section_description: string;
  competitors: CompetitorSnapshot[];
}

// ─────────────────────────────────────────────
// Section 6: Goals — Annual Goal Alignment
// ─────────────────────────────────────────────

export interface AnnualGoal {
  business_outcome: string;
  metric: string;
  description: string;
  benchmark: string;
  annual_goal: string;
  data_source: string;
}

export interface GoalsSection {
  section_description: string;
  outcomes: AnnualGoal[];
  rationale: string[];
}

// ─────────────────────────────────────────────
// Section 7: Roadmap — 90-Day Phased Execution
// ─────────────────────────────────────────────

export interface RoadmapPhase {
  name: string;
  timeframe: string;
  theme: string;
  deliverables: string[];
  milestone: string;
}

export interface RoadmapPhasesSection {
  section_description: string;
  phases: RoadmapPhase[];
}

// ─────────────────────────────────────────────
// Section 8: Quarterly Marketing Initiatives (OKRs)
// ─────────────────────────────────────────────

export interface QuarterlyObjective {
  objective: string;
  key_results: string[];
}

export interface QuarterlyInitiativesSection {
  section_description: string;
  objectives: QuarterlyObjective[];
}

// ─────────────────────────────────────────────
// Section 9: Annual High-Level Plan (Gantt-style)
// ─────────────────────────────────────────────

export interface AnnualPlanInitiative {
  initiative: string;
  description: string;
  months: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
}

export interface AnnualPlanCategory {
  category: string;
  initiatives: AnnualPlanInitiative[];
}

export interface AnnualPlan {
  section_description: string;
  categories: AnnualPlanCategory[];
}

// ─────────────────────────────────────────────
// Section 10: Points Plan
// ─────────────────────────────────────────────

export interface PointsPlanTask {
  task: string;
  description: string;
  stage: "Foundation" | "Execution" | "Analysis";
  points: number;
}

export interface MonthlyPointsAllocation {
  month: string;
  tasks: PointsPlanTask[];
  month_total: number;
}

export interface PointsPlan {
  section_description: string;
  total_points: number;
  months: MonthlyPointsAllocation[];
}

// ═════════════════════════════════════════════
// FULL OUTPUT SCHEMA
// ═════════════════════════════════════════════

export interface GeneratedRoadmapOutput {
  type: "roadmap";
  title: string;
  summary: string;

  overview: RoadmapOverview;
  target_market: TargetMarketSection;
  brand_story: BrandStory;
  products_and_solutions: ProductsAndSolutions;
  competition: CompetitionSection;
  goals: GoalsSection;
  roadmap_phases: RoadmapPhasesSection;
  quarterly_initiatives: QuarterlyInitiativesSection;
  annual_plan: AnnualPlan;
  points_plan: PointsPlan;

  metadata: {
    model: string;
    version: number;
    generated_at: string;
    research_document_title: string;
  };
}

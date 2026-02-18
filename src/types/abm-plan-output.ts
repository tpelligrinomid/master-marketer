// --- Document Section (same pattern as content plan / research) ---

export interface AbmPlanSection {
  section_number: number;
  section_title: string;
  markdown: string;
  word_count: number;
}

// --- Full Output Schema ---

export interface GeneratedAbmPlanOutput {
  type: "abm_plan";
  title: string;
  summary: string;
  sections: AbmPlanSection[];
  full_document_markdown: string;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    total_word_count: number;
    roadmap_title: string;
    channels_enabled: string[];
    total_target_accounts: number;
  };
}

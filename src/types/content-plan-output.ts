// --- Document Section (same pattern as research) ---

export interface ContentPlanSection {
  section_number: number;
  section_title: string;
  markdown: string;
  word_count: number;
}

// --- Full Output Schema ---

export interface GeneratedContentPlanOutput {
  type: "content_plan";
  title: string;
  summary: string;
  sections: ContentPlanSection[];
  full_document_markdown: string;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    total_word_count: number;
    roadmap_title: string;
    seo_audit_title: string;
  };
}

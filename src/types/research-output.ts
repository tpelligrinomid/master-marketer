// --- Document Section ---

export interface ResearchDocumentSection {
  section_number: number;
  section_title: string;
  markdown: string;
  word_count: number;
}

// --- Competitive Score ---

export interface ScoreJustification {
  organic_seo: string;
  social_media: string;
  content_strategy: string;
  paid_media: string;
  brand_positioning: string;
}

export interface CompetitorScore {
  organic_seo: number; // 1-10
  social_media: number;
  content_strategy: number;
  paid_media: number;
  brand_positioning: number;
  overall: number;
  justification: ScoreJustification;
}

// --- Full Research Output ---

export interface ResearchOutput {
  type: "research";
  title: string;
  summary: string;
  sections: ResearchDocumentSection[];
  competitive_scores: Record<string, CompetitorScore>;
  full_document_markdown: string;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    total_word_count: number;
    intelligence_summary: {
      companies_analyzed: number;
      data_sources_succeeded: number;
      data_sources_failed: number;
      errors: string[];
    };
  };
}

export interface BriefOutput {
  type: "brief";
  title: string;
  full_document_markdown: string;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    total_word_count: number;
    reference_deliverables_used: number;
    reference_images_used: number;
  };
}

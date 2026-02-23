export interface ContentPieceSection {
  heading: string;
  content: string;
}

export interface SocialSnippets {
  linkedin?: string;
  twitter?: string;
}

export interface ContentPieceStructured {
  title: string;
  meta_description?: string;
  social_snippets?: SocialSnippets;
  sections: ContentPieceSection[];
  word_count: number;
  tags_suggested: string[];
}

export interface ContentPieceOutput {
  content_body: string;
  content_structured: ContentPieceStructured;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    content_type: string;
  };
}

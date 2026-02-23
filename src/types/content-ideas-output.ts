export interface ContentIdea {
  title: string;
  description: string;
  content_type: string;
  category: string;
  tags: string[];
  priority_suggestion: number; // 1-5
  reasoning: string;
}

export interface ContentIdeasOutput {
  ideas: ContentIdea[];
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    ideas_count: number;
  };
}

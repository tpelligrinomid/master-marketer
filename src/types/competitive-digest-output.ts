export interface CompetitorContent {
  title: string;
  url: string;
  type: string;
  published_date: string;
  summary: string;
  engagement?: Record<string, unknown>;
}

export interface CompetitorActivity {
  name: string;
  new_content: CompetitorContent[];
  notable_changes: string[];
}

export interface IndustryTrendSource {
  title: string;
  url: string;
}

export interface IndustryTrend {
  topic: string;
  summary: string;
  sources: IndustryTrendSource[];
}

export interface ContentOpportunity {
  opportunity: string;
  reasoning: string;
  suggested_content_type: string;
  suggested_category: string;
  urgency: string;
}

export interface CompetitiveDigestStructured {
  competitors: CompetitorActivity[];
  industry_trends: IndustryTrend[];
  content_opportunities: ContentOpportunity[];
}

export interface CompetitiveDigestOutput {
  title: string;
  period: { start: string; end: string };
  content_body: string;
  content_structured: CompetitiveDigestStructured;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    sources_checked: number;
    exa_queries_run: number;
    competitors_analyzed: number;
    lookback_days: number;
  };
}

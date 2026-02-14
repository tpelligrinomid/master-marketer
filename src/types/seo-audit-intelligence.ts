import { MozDomainMetrics } from "./research-intelligence";

// ─────────────────────────────────────────────
// OnPage API types
// ─────────────────────────────────────────────

export interface OnPageCrawlSummary {
  domain: string;
  pages_crawled: number;
  pages_with_issues: number;
  broken_resources: number;
  broken_links_count: number;
  duplicate_title_count: number;
  duplicate_description_count: number;
  redirect_chains_count: number;
  non_indexable_count: number;
  pages_with_microdata: number;
  onpage_score: number | null;
  crawl_status: string;
  /** page_metrics.checks — maps check names to page counts */
  checks: Record<string, number>;
}

export interface OnPagePageData {
  url: string;
  status_code: number;
  title?: string;
  description?: string;
  h1?: string[];
  content_word_count?: number;
  page_timing?: number;
  onpage_score?: number;
  meta_robots?: string;
  canonical?: string;
  is_broken?: boolean;
  is_redirect?: boolean;
  checks?: Record<string, boolean>;
  resource_errors?: number;
  images_count?: number;
  images_without_alt?: number;
  internal_links_count?: number;
  external_links_count?: number;
}

export interface DuplicateTagItem {
  tag_type: "title" | "description";
  duplicate_value: string;
  pages: string[];
}

export interface RedirectChainItem {
  from_url: string;
  to_url: string;
  chain_length: number;
  is_loop: boolean;
}

export interface NonIndexableItem {
  url: string;
  reason: string;
}

export interface MicrodataItem {
  url: string;
  types: string[];
  items_count: number;
}

export interface LighthouseResult {
  url: string;
  performance_score?: number;
  accessibility_score?: number;
  best_practices_score?: number;
  seo_score?: number;
  first_contentful_paint?: number;
  largest_contentful_paint?: number;
  total_blocking_time?: number;
  cumulative_layout_shift?: number;
  speed_index?: number;
  time_to_interactive?: number;
}

// ─────────────────────────────────────────────
// Labs API types (keywords, competitors, intent)
// ─────────────────────────────────────────────

export interface RankedKeyword {
  keyword: string;
  position: number;
  search_volume: number;
  keyword_difficulty?: number;
  cpc?: number;
  url?: string;
  intent?: string;
  serp_features?: string[];
  traffic_share?: number;
}

export interface ContentGapKeyword {
  keyword: string;
  search_volume: number;
  keyword_difficulty?: number;
  intent?: string;
  competitor_positions: Record<string, number>;
  client_position?: number | null;
}

export interface CompetitorDomain {
  domain: string;
  common_keywords: number;
  competitor_keywords: number;
  avg_position?: number;
  intersection_score?: number;
}

export interface SearchIntentResult {
  keyword: string;
  intent: string;
  secondary_intent?: string;
}

// ─────────────────────────────────────────────
// Backlinks API types
// ─────────────────────────────────────────────

export interface BacklinkSummary {
  domain: string;
  total_backlinks: number;
  referring_domains: number;
  referring_ips: number;
  dofollow: number;
  nofollow: number;
  domain_rank?: number;
  backlinks_spam_score?: number;
  broken_backlinks?: number;
}

export interface BacklinkItem {
  source_url: string;
  target_url: string;
  anchor_text?: string;
  dofollow: boolean;
  domain_rank?: number;
  page_rank?: number;
  first_seen?: string;
}

export interface AnchorTextItem {
  anchor_text: string;
  backlinks_count: number;
  referring_domains: number;
}

export interface ReferringDomainItem {
  domain: string;
  backlinks_count: number;
  domain_rank?: number;
  first_seen?: string;
}

export interface BacklinkGapItem {
  domain: string;
  has_backlink_from: string[];
  missing_from: string[];
}

// ─────────────────────────────────────────────
// SERP API types
// ─────────────────────────────────────────────

export interface SerpResult {
  keyword: string;
  search_volume?: number;
  organic_results: Array<{
    position: number;
    url: string;
    title: string;
    domain: string;
  }>;
  featured_snippet?: {
    url: string;
    title: string;
    description: string;
  };
  people_also_ask?: Array<{
    question: string;
    expanded_element?: string;
  }>;
  ai_overview?: {
    present: boolean;
    content?: string;
    references?: Array<{
      url: string;
      title: string;
    }>;
  };
  serp_features: string[];
}

// ─────────────────────────────────────────────
// AEO / AI Optimization API types
// ─────────────────────────────────────────────

export interface LlmMention {
  keyword: string;
  engine: string;
  brand_mentioned: boolean;
  mention_context?: string;
  competitors_mentioned?: string[];
}

export interface LlmResponse {
  query: string;
  engine: string;
  response_text?: string;
  references?: Array<{
    url: string;
    title?: string;
  }>;
  brand_mentioned: boolean;
}

// ─────────────────────────────────────────────
// PageSpeed Insights types
// ─────────────────────────────────────────────

export interface PageSpeedResult {
  url: string;
  performance_score?: number;
  first_contentful_paint?: number;
  largest_contentful_paint?: number;
  total_blocking_time?: number;
  cumulative_layout_shift?: number;
  speed_index?: number;
  time_to_interactive?: number;
  field_data?: {
    fcp_p75?: number;
    lcp_p75?: number;
    fid_p75?: number;
    cls_p75?: number;
    inp_p75?: number;
    ttfb_p75?: number;
  };
}

// ─────────────────────────────────────────────
// Keywords Everywhere types
// ─────────────────────────────────────────────

export interface KeKeywordData {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  trend: Array<{ month: string; year: number; value: number }>;
}

export interface KeRelatedKeyword {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
}

export interface KePasfKeyword {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
}

export interface KeDomainTraffic {
  domain: string;
  estimated_monthly_traffic: number;
  organic_keywords: number;
  organic_traffic_cost: number;
}

export interface KeywordsEverywhereData {
  keyword_metrics: KeKeywordData[];
  related_keywords: KeRelatedKeyword[];
  pasf_keywords: KePasfKeyword[];
  domain_traffic: KeDomainTraffic[];
}

// ─────────────────────────────────────────────
// Combined intelligence per company
// ─────────────────────────────────────────────

export interface CompanySeoIntelligence {
  company_name: string;
  domain: string;
  ranked_keywords?: RankedKeyword[];
  content_gap_keywords?: ContentGapKeyword[];
  competitor_domains?: CompetitorDomain[];
  backlink_summary?: BacklinkSummary;
  backlinks?: BacklinkItem[];
  anchors?: AnchorTextItem[];
  referring_domains?: ReferringDomainItem[];
  moz_metrics?: MozDomainMetrics;
  errors: string[];
}

// ─────────────────────────────────────────────
// Full intelligence package (all data for one audit)
// ─────────────────────────────────────────────

export interface SeoIntelligencePackage {
  client: CompanySeoIntelligence;
  competitors: CompanySeoIntelligence[];

  // OnPage data (client only)
  onpage_summary?: OnPageCrawlSummary;
  onpage_pages?: OnPagePageData[];
  duplicate_tags?: DuplicateTagItem[];
  redirect_chains?: RedirectChainItem[];
  non_indexable?: NonIndexableItem[];
  microdata?: MicrodataItem[];
  lighthouse_results?: LighthouseResult[];

  // SERP + AEO data
  serp_results?: SerpResult[];
  llm_mentions?: LlmMention[];
  llm_responses?: LlmResponse[];

  // PageSpeed field data
  pagespeed_results?: PageSpeedResult[];

  // Backlink gap analysis (cross-company)
  backlink_gap?: BacklinkGapItem[];

  // Keywords Everywhere enrichment
  keywords_everywhere?: KeywordsEverywhereData;

  gathered_at: string;
  errors: string[];
}

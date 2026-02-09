// --- Social Media Intelligence ---

export interface LinkedInCompanyData {
  name: string;
  description?: string;
  followers?: number;
  employee_count?: string;
  specialties?: string[];
  headquarters?: string;
  industry?: string;
  website?: string;
  founded?: string;
  recent_posts?: LinkedInPost[];
}

export interface LinkedInPost {
  text?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  posted_at?: string;
}

export interface YouTubeChannelData {
  channel_id: string;
  title?: string;
  description?: string;
  subscriber_count?: number;
  video_count?: number;
  view_count?: number;
  recent_videos?: YouTubeVideo[];
}

export interface YouTubeVideo {
  video_id: string;
  title: string;
  description?: string;
  published_at?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  duration?: string;
  tags?: string[];
}

export interface SocialMediaIntelligence {
  linkedin?: LinkedInCompanyData;
  youtube?: YouTubeChannelData;
}

// --- Organic / SEO Intelligence ---

export interface MozDomainMetrics {
  domain: string;
  domain_authority?: number;
  page_authority?: number;
  spam_score?: number;
  external_links?: number;
  linking_domains?: number;
}

export interface MozKeyword {
  keyword: string;
  ranking_position?: number;
  search_volume?: number;
  difficulty?: number;
}

export interface MozTopPage {
  url: string;
  page_authority?: number;
  external_links?: number;
  title?: string;
}

export interface FirecrawlPage {
  url: string;
  title?: string;
  markdown: string;
  status_code?: number;
}

export interface OrganicIntelligence {
  moz_metrics?: MozDomainMetrics;
  moz_keywords?: MozKeyword[];
  moz_top_pages?: MozTopPage[];
  website_pages?: FirecrawlPage[];
}

// --- Paid Media Intelligence ---

export interface LinkedInAd {
  ad_id?: string;
  advertiser_name?: string;
  headline?: string;
  body?: string;
  cta?: string;
  image_url?: string;
  landing_page_url?: string;
  start_date?: string;
  impressions?: string;
}

export interface GoogleAd {
  ad_id?: string;
  advertiser_name?: string;
  headline?: string;
  description?: string;
  image_url?: string;
  landing_page_url?: string;
  format?: string;
  first_shown?: string;
  last_shown?: string;
  region?: string;
}

export interface SpyFuPPCKeyword {
  keyword: string;
  position?: number;
  cost_per_click?: number;
  monthly_clicks?: number;
  monthly_cost?: number;
  ad_count?: number;
}

export interface SpyFuAdHistory {
  keyword?: string;
  headline?: string;
  description?: string;
  display_url?: string;
  landing_page?: string;
  first_seen?: string;
  last_seen?: string;
  ad_position?: number;
}

export interface AdCreativeAnalysis {
  summary: string;
  themes: string[];
  messaging_patterns: string[];
  visual_patterns: string[];
  cta_patterns: string[];
  targeting_observations: string[];
}

export interface PaidMediaIntelligence {
  linkedin_ads?: LinkedInAd[];
  google_ads?: GoogleAd[];
  spyfu_ppc_keywords?: SpyFuPPCKeyword[];
  spyfu_ad_history?: SpyFuAdHistory[];
  ad_creative_analysis?: AdCreativeAnalysis;
}

// --- Combined Company Intelligence ---

export interface CompanyIntelligence {
  company_name: string;
  domain: string;
  social: SocialMediaIntelligence;
  organic: OrganicIntelligence;
  paid: PaidMediaIntelligence;
  errors: string[]; // Tracks which data sources failed
}

// --- Web Research (Exa.ai) ---

export interface WebResearchResult {
  title: string;
  url: string;
  content: string;
  query: string;
}

// --- Full Intelligence Package ---

export interface IntelligencePackage {
  client: CompanyIntelligence;
  competitors: CompanyIntelligence[];
  web_research?: WebResearchResult[];
  gathered_at: string;
}

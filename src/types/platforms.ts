export const PLATFORMS = ["linkedin", "google", "meta"] as const;
export type Platform = typeof PLATFORMS[number];

export const CAMPAIGN_GOALS = [
  "awareness",
  "lead_gen",
  "demo_request",
  "content_download",
  "website_traffic",
  "event_registration",
] as const;
export type CampaignGoal = typeof CAMPAIGN_GOALS[number];

export const FILE_TYPES = [
  "competitor_ad",
  "brand_guidelines",
  "product_sheet",
  "other",
] as const;
export type FileType = typeof FILE_TYPES[number];

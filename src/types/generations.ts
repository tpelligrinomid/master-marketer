export interface LinkedInAdVariation {
  variationName: string;
  headline: string;
  introText: string;
  description: string;
  ctaButton: string;
  rationale: string;
}

export interface GoogleAdVariation {
  variationName: string;
  headlines: string[];
  descriptions: string[];
  sitelinks?: {
    text: string;
    description1: string;
    description2: string;
  }[];
  rationale: string;
}

export interface MetaAdVariation {
  variationName: string;
  primaryText: string;
  headline: string;
  description: string;
  ctaButton: string;
  rationale: string;
}

export interface GenerationOutput {
  generatedAt: string;
  platforms: {
    linkedin?: {
      platformName: "LinkedIn Ads";
      variations: LinkedInAdVariation[];
    };
    google?: {
      platformName: "Google Ads";
      variations: GoogleAdVariation[];
    };
    meta?: {
      platformName: "Meta (Facebook/Instagram)";
      variations: MetaAdVariation[];
    };
  };
}

export interface Generation {
  id: string;
  brief_id: string;
  project_id: string;
  status: "pending" | "processing" | "complete" | "failed";
  current_step: string | null;
  trigger_run_id: string | null;
  platforms: string[];
  output: GenerationOutput | null;
  error_message: string | null;
  model_used: string;
  prompt_tokens_used: number | null;
  completion_tokens_used: number | null;
  created_at: string;
  updated_at: string;
}

import { ZodSchema } from "zod";

/**
 * Converts a Zod schema to a human-readable description of the expected JSON structure.
 * This is a simplified version — provides the schema shape for prompt injection
 * rather than a full JSON Schema spec.
 */
export function zodToJsonSchema(_schema: ZodSchema): Record<string, unknown> {
  // Rather than doing a full Zod-to-JSON-Schema conversion (which requires
  // an additional library), we define the expected structure explicitly.
  // This is more readable for the LLM and gives us control over descriptions.
  return {
    campaign_name: "string (descriptive campaign name)",
    company: {
      company_name: "string (required)",
      company_website: "string URL (optional)",
      product_summary: "string - one-liner of what the product does (required)",
      differentiators: ["string - what makes this different (at least 1, required)"],
      proof_points: ["string - metrics, customer results, awards (optional)"],
      customer_references: ["string - named customers (optional)"],
      category: "string - product category e.g. 'observability platform' (optional)",
      pricing_hook: "string - pricing info if relevant to ad (optional)",
    },
    audience: {
      job_titles: ["string - specific titles like 'VP of Engineering' (at least 1, required)"],
      seniority: ["enum: c_suite | vp | director | manager | individual_contributor (at least 1, required)"],
      pain_points: ["string - specific problems in their language (at least 1, required)"],
      buying_triggers: ["string - what would make them act now (optional)"],
      verticals: ["string - industry verticals (optional)"],
      company_size: "enum: startup | smb | mid_market | enterprise (optional)",
      decision_criteria: ["string - what they evaluate on (optional)"],
      current_tools: ["string - tools/solutions they use today (optional)"],
    },
    objectives: {
      primary_cta: "string - desired action e.g. 'Request a Demo' (required)",
      offer: "string - what the audience gets e.g. 'Free trial' (required)",
      goal: "enum: awareness | lead_generation | demo_requests | content_download | free_trial_signup | event_registration | retargeting (required)",
      funnel_stage: "enum: top | middle | bottom (required)",
      primary_message: "string - key message to lead with (required)",
      supporting_messages: ["string - secondary messages (optional)"],
    },
    platform: {
      platforms: ["enum: linkedin | display (at least 1, required)"],
      ad_types: ["enum: testimonial | numbers | statement | comparison | pain_point | social_proof | question | how_to (at least 1, required)"],
      variations_per_type: "number 1-5, default 3",
    },
    tone: {
      voice: "enum: professional | conversational | authoritative | provocative | empathetic (default: professional)",
      guidelines: ["string - specific writing guidelines (optional)"],
      blacklist: ["string - words/phrases to avoid (optional)"],
      must_include: ["string - words/phrases to include (optional)"],
    },
    additional_context: "string - any extra context (optional)",
  };
}

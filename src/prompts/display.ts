import { CampaignInput } from "../types/campaign-input";
import { buildContextBlock, selectExamples, formatExamplesBlock, buildVisualStylesBlock } from "./helpers";

const AD_TYPE_INSTRUCTIONS: Record<string, { name: string; instruction: string }> = {
  numbers: {
    name: "Numbers / Metrics",
    instruction: "The number IS the headline. One stat that stops the eye. Supporting text adds minimal context.",
  },
  pain_point: {
    name: "Pain Point",
    instruction: "One sharp question or statement that names the pain. Supporting text hints at the solution.",
  },
  testimonial: {
    name: "Testimonial",
    instruction: "A short quote or named customer reference. The name/logo does the heavy lifting.",
  },
  statement: {
    name: "Bold Statement",
    instruction: "One clear, confident claim. No room for nuance — pick the single strongest point.",
  },
  comparison: {
    name: "Comparison",
    instruction: "Before → After or Old → New. Use an arrow or contrast format. Minimal words, maximum contrast.",
  },
  question: {
    name: "Question",
    instruction: "One provocative question. Supporting text is the implied answer.",
  },
  social_proof: {
    name: "Social Proof",
    instruction: "Logo name or user count as headline. The recognition does the selling.",
  },
  how_to: {
    name: "How-To",
    instruction: "One actionable phrase that names a practice or concept the audience knows. Body delivers the punchline.",
  },
};

export function buildDisplayPrompt(
  input: CampaignInput,
  adType: string,
  variationCount: number,
  library: { examples: Array<Record<string, string>> },
  visualLibrary: { visual_formats: Array<Record<string, unknown>> },
): string {
  const typeConfig = AD_TYPE_INSTRUCTIONS[adType];
  if (!typeConfig) {
    throw new Error(`Unknown ad type: ${adType}`);
  }

  const context = buildContextBlock(input);
  const examples = selectExamples(library, adType, "display");
  const examplesBlock = formatExamplesBlock(examples);
  const visualStylesBlock = buildVisualStylesBlock(visualLibrary, adType, variationCount);

  return `## Task
Generate ${variationCount} display/banner ad variations using the "${typeConfig.name}" approach.

## Ad Type: ${typeConfig.name}
${typeConfig.instruction}

## Display Ad Format Constraints
- Headline: MAXIMUM 30 characters (this must convey the entire message alone)
- Body: MAXIMUM 90 characters (one supporting line — many viewers won't read this)
- CTA: MAXIMUM 15 characters (button text)

CRITICAL RULES FOR DISPLAY ADS:
- You have a 2-SECOND attention window. One idea per ad. Period.
- The headline must work WITHOUT the body text — treat the body as optional bonus context
- Every word must earn its place. If removing a word doesn't lose meaning, remove it.
- No jargon that requires context to understand
- The CTA must be action-oriented and short

${context}
${examplesBlock}
${visualStylesBlock}

## Output Format
Return a JSON array of exactly ${variationCount} variations.

IMPORTANT: Display/banner ads ARE the image. ALL copy is rendered on the image itself. You must clearly specify what text goes where and provide visual direction so a designer can produce the ad.

\`\`\`json
[
  {
    "ad_type": "${adType}",
    "platform": "display",
    "image_copy": {
      "primary_text": "the main headline rendered on the banner (max 30 chars — this IS the ad)",
      "primary_text_char_count": <number>,
      "supporting_text": "secondary line on the banner (max 90 chars — optional, many viewers won't read it)",
      "supporting_text_char_count": <number>,
      "cta_text": "button/badge text on the banner (max 15 chars)",
      "cta_text_char_count": <number>
    },
    "visual_direction": {
      "concept": "1-2 sentence description of the banner layout — where does the text sit, what's the visual focal point, what's the hierarchy",
      "style_notes": "specific design guidance: colors, typography feel, imagery type (abstract, photo, illustration, data viz, icon-driven, etc.)",
      "reference_description": "describe a visual reference the designer could search for or relate to (e.g., 'Minimal dark background, bold white sans-serif headline left-aligned, small CTA button bottom-right')",
      "sizes_to_design": ["300x250", "728x90", "160x600", "320x50"]
    },
    "target_role": "the specific role this variation targets",
    "angle": "brief description of the strategic angle",
    "rationale": "1-2 sentences: why this will work for this specific audience"
  }
]
\`\`\`

Return ONLY the JSON array. No other text.`;
}

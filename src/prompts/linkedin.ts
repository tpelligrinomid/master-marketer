import { CampaignInput } from "../types/campaign-input";
import { buildContextBlock, selectExamples, formatExamplesBlock, buildVisualStylesBlock } from "./helpers";

interface AdTypeConfig {
  name: string;
  instruction: string;
  guidelines: string[];
}

const AD_TYPE_INSTRUCTIONS: Record<string, AdTypeConfig> = {
  numbers: {
    name: "Numbers / Metrics",
    instruction: "Lead with a compelling, specific statistic or metric. The number should be the first thing the reader sees.",
    guidelines: [
      "The metric must matter to the target audience's KPIs",
      "Use specific numbers (73%) not vague ones ('significant improvement')",
      "Pair the number with a clear 'so what' for the reader",
    ],
  },
  pain_point: {
    name: "Pain Point",
    instruction: "Open with the specific problem the target audience is experiencing. Mirror their frustration in their own language, then pivot to the solution.",
    guidelines: [
      "Name the exact pain, not a generic category",
      "Use language the audience actually uses, not marketing-speak",
      "The pain should feel urgent and current",
      "The pivot to solution should feel natural, not a hard sell",
    ],
  },
  testimonial: {
    name: "Testimonial / Social Proof Quote",
    instruction: "Lead with a customer quote, result, or named reference. The reader should think 'that could be me.'",
    guidelines: [
      "Use specific, measurable results",
      "Name the company and/or person's role",
      "The result should be relevant to the target audience's priorities",
      "The quote should sound like a real person, not marketing copy",
    ],
  },
  statement: {
    name: "Bold Statement",
    instruction: "Make a confident, specific claim or value proposition. No hedging. The statement should be true, surprising, and impossible to ignore.",
    guidelines: [
      "One clear idea, not three crammed together",
      "The claim must be specific to this product — not interchangeable with competitors",
      "Confidence without arrogance",
      "Slightly surprising or counterintuitive claims perform best",
    ],
  },
  comparison: {
    name: "Comparison",
    instruction: "Position against the status quo or alternative approaches. Show the gap between what the audience has and what they could have.",
    guidelines: [
      "Compare to the category/approach, not by naming competitors directly",
      "Use concrete contrasts (time, cost, complexity)",
      "Make the reader feel the cost of inaction",
      "Be fair — exaggerated claims erode trust in B2B",
    ],
  },
  question: {
    name: "Provocative Question",
    instruction: "Open with a question that the target audience can't scroll past. The question should imply a problem they immediately recognize.",
    guidelines: [
      "The reader should think 'yes, that's me' within 1 second",
      "Don't ask questions with obvious or generic answers",
      "The question must be specific to their role and challenges",
      "Follow with a concise answer that introduces the product",
    ],
  },
  social_proof: {
    name: "Social Proof / Trust Signals",
    instruction: "Lead with customer logos, user counts, certifications, or industry recognition. Establish credibility before making any pitch.",
    guidelines: [
      "Use names the target audience will recognize as peers",
      "Specificity wins: '400+ engineering teams' beats 'thousands of users'",
      "Match the social proof to the audience's peer group",
      "Works best for building awareness and trust",
    ],
  },
  how_to: {
    name: "How-To / Educational",
    instruction: "Take an educational angle — teach something useful while naturally positioning the product as the solution. Give value before asking for anything.",
    guidelines: [
      "The insight should be genuinely useful, not a disguised pitch",
      "Frame it as solving a problem the audience is actively working on",
      "Keep it actionable and specific",
      "The product tie-in should feel earned, not forced",
    ],
  },
};

export function buildLinkedInPrompt(
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
  const examples = selectExamples(library, adType, "linkedin");
  const examplesBlock = formatExamplesBlock(examples);
  const visualStylesBlock = buildVisualStylesBlock(visualLibrary, adType, variationCount);

  return `## Task
Generate ${variationCount} LinkedIn Sponsored Content ad variations using the "${typeConfig.name}" approach.

## Ad Type: ${typeConfig.name}
${typeConfig.instruction}

### Guidelines for This Ad Type:
${typeConfig.guidelines.map(g => `- ${g}`).join("\n")}

## LinkedIn Format Constraints
- Headline: MAXIMUM 70 characters (appears below the image/video — this is your hook)
- Body (Intro Text): MAXIMUM 600 characters (appears above the creative — only first ~150 chars visible before "see more")
- CTA: Short call-to-action text

CRITICAL: The first line of the body text MUST earn the click to "see more." Don't waste it on setup — lead with the punch.

## Character Limit Rules
- Count EVERY character including spaces and punctuation
- If a headline is 71+ characters, it WILL be truncated — this is unacceptable
- The body's first 150 characters are what the audience sees without clicking — front-load your best line there

${context}
${examplesBlock}
${visualStylesBlock}

## Output Format
Return a JSON array of exactly ${variationCount} variations. Each variation should target different job titles from the audience where possible, or take different angles on the same role.

IMPORTANT: LinkedIn Sponsored Content ads have TWO text areas — the post text (body) that appears above the image, and the IMAGE itself which contains text overlay. You must specify BOTH, and clearly separate what goes ON the image vs what goes in the post text.

\`\`\`json
[
  {
    "ad_type": "${adType}",
    "platform": "linkedin",
    "post_text": "the body copy that appears ABOVE the image in the LinkedIn feed (max 600 chars)",
    "post_text_char_count": <number>,
    "image_copy": {
      "primary_text": "the main headline/text rendered ON the ad image itself (keep to 8-12 words max for readability)",
      "supporting_text": "optional secondary line on the image — a proof point, stat, or clarifier (keep to 6-10 words max, or empty string if not needed)",
      "cta_text": "CTA text on the image button or badge (e.g. 'Get Free Report →')"
    },
    "headline": "the LinkedIn headline field that appears below the image (max 70 chars)",
    "headline_char_count": <number>,
    "visual_direction": {
      "concept": "1-2 sentence description of what the image should look like — layout, mood, visual metaphor",
      "style_notes": "specific design guidance: colors, typography feel, imagery type (abstract, photo, illustration, data viz, etc.)",
      "reference_description": "describe a visual reference the designer could search for or relate to (e.g., 'Think dark tech dashboard with a single glowing metric in the center')"
    },
    "target_role": "the specific role this variation targets",
    "angle": "brief description of the strategic angle",
    "rationale": "1-2 sentences: why this will work for this specific audience"
  }
]
\`\`\`

Return ONLY the JSON array. No other text.`;
}

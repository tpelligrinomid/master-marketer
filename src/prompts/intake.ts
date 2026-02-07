import { CampaignInputSchema } from "../types/campaign-input";
import { zodToJsonSchema } from "../lib/zod-to-schema";

/**
 * Builds the system prompt for the intake step.
 * Claude's job: read messy source docs and extract a structured campaign input.
 */
export const INTAKE_SYSTEM_PROMPT = `You are a senior B2B marketing strategist who specializes in translating raw strategy documents, meeting notes, and planning materials into structured advertising campaign briefs.

Your job is to read the provided source materials and extract a structured JSON campaign input that an ad copywriting system will use to generate LinkedIn ads and display ads.

You are meticulous about:
- Extracting SPECIFIC details, not generalizing. If the doc says "VP of Engineering at mid-market SaaS companies," you write exactly that — not "technology leaders."
- Identifying the target audience's actual pain points from the source material, using the language in the documents
- Distinguishing between what's explicitly stated vs. what you're inferring (mark inferences in the review_notes)
- Flagging gaps — if critical information is missing, say so clearly

You output valid JSON only. No markdown, no explanations outside the JSON.`;

/**
 * Builds the user prompt for the intake step.
 */
export function buildIntakePrompt(
  sourceDocuments: { filename: string; content: string }[],
  additionalGuidance?: string,
): string {
  const schema = zodToJsonSchema(CampaignInputSchema);

  const docBlocks = sourceDocuments.map((doc, i) => {
    return `### Source Document ${i + 1}: ${doc.filename}
\`\`\`
${doc.content}
\`\`\``;
  }).join("\n\n");

  return `## Task
Read the following source documents and extract a structured campaign input JSON for ad generation.

## Source Materials
${docBlocks}

${additionalGuidance ? `## Additional Guidance from Strategist\n${additionalGuidance}\n` : ""}

## Target JSON Schema
The output must conform to this schema:
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

## Important Extraction Rules

1. **campaign_name**: Create a descriptive name from the materials (e.g., "Q1 2026 - [Company] - [Goal] - [Audience]")

2. **company**: Extract company name, product description, differentiators, and proof points. Look for:
   - Product descriptions, feature lists, value propositions
   - Customer names, case studies, metrics
   - Competitive positioning

3. **audience**: This is the MOST IMPORTANT section. Be extremely specific:
   - Extract exact job titles mentioned, not generic roles
   - Capture pain points in the audience's own language from the docs
   - Look for buying triggers (what would make them act now)
   - Note any mentioned current tools or competitors they use

4. **objectives**: Extract campaign goals, desired CTAs, and key messages. Look for:
   - What action the campaign should drive
   - What offer or content is being promoted
   - Where in the funnel this audience sits

5. **platform**: Default to both "linkedin" and "display" unless the docs specify otherwise.
   For ad_types, select the most appropriate types based on the available material:
   - If there are strong metrics/numbers → include "numbers"
   - If there are customer quotes/results → include "testimonial"
   - If pain points are well-articulated → include "pain_point"
   - If competitive positioning is clear → include "comparison"
   - Default to at least: ["numbers", "pain_point", "statement"]

6. **tone**: Extract any brand voice guidelines, writing style notes, or words to avoid/include.

## Output Format
Return a JSON object with two top-level keys:

\`\`\`json
{
  "campaign_input": {
    // ... the full campaign input conforming to the schema above
  },
  "review_notes": {
    "confidence": "high" | "medium" | "low",
    "extracted_from": ["which documents provided which sections"],
    "gaps": ["list of important fields that were missing from source materials and were inferred or left empty"],
    "assumptions": ["list of assumptions made where the source material was ambiguous"],
    "suggestions": ["recommendations for the strategist to improve the brief before generating ads"]
  }
}
\`\`\`

Return ONLY valid JSON. No other text.`;
}

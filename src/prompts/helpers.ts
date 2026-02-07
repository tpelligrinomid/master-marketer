import { CampaignInput } from "../types/campaign-input";

/**
 * Assembles all campaign context into a structured block for the LLM prompt.
 * This is the "brief" that the LLM uses to write targeted copy.
 */
export function buildContextBlock(input: CampaignInput): string {
  const sections: string[] = [];

  // Company & Product
  sections.push(`## Company & Product
- Company: ${input.company.company_name}
- Product: ${input.company.product_summary}
- Category: ${input.company.category || "B2B Technology"}
- Differentiators:
${input.company.differentiators.map(d => `  • ${d}`).join("\n")}`);

  if (input.company.proof_points?.length) {
    sections.push(`- Proof Points:
${input.company.proof_points.map(p => `  • ${p}`).join("\n")}`);
  }

  if (input.company.customer_references?.length) {
    sections.push(`- Named Customers: ${input.company.customer_references.join(", ")}`);
  }

  if (input.company.pricing_hook) {
    sections.push(`- Pricing: ${input.company.pricing_hook}`);
  }

  // Target Audience — the most important section
  sections.push(`\n## Target Audience (BE SPECIFIC TO THESE PEOPLE)
- Job Titles: ${input.audience.job_titles.join(", ")}
- Seniority: ${input.audience.seniority.join(", ")}
- Their Pain Points:
${input.audience.pain_points.map(p => `  • ${p}`).join("\n")}`);

  if (input.audience.buying_triggers?.length) {
    sections.push(`- What Would Trigger Them to Buy Now:
${input.audience.buying_triggers.map(t => `  • ${t}`).join("\n")}`);
  }

  if (input.audience.verticals?.length) {
    sections.push(`- Industries: ${input.audience.verticals.join(", ")}`);
  }

  if (input.audience.company_size) {
    sections.push(`- Company Size: ${input.audience.company_size}`);
  }

  if (input.audience.decision_criteria?.length) {
    sections.push(`- What They Evaluate On:
${input.audience.decision_criteria.map(c => `  • ${c}`).join("\n")}`);
  }

  if (input.audience.current_tools?.length) {
    sections.push(`- Tools They Likely Use Today: ${input.audience.current_tools.join(", ")}`);
  }

  // Campaign Objectives
  sections.push(`\n## Campaign Objectives
- Goal: ${input.objectives.goal}
- Funnel Stage: ${input.objectives.funnel_stage}
- Primary CTA: ${input.objectives.primary_cta}
- Offer: ${input.objectives.offer}
- Primary Message: ${input.objectives.primary_message}`);

  if (input.objectives.supporting_messages?.length) {
    sections.push(`- Supporting Messages:
${input.objectives.supporting_messages.map(m => `  • ${m}`).join("\n")}`);
  }

  // Tone & Voice
  if (input.tone) {
    sections.push(`\n## Tone & Voice
- Voice: ${input.tone.voice}`);

    if (input.tone.guidelines?.length) {
      sections.push(`- Guidelines:
${input.tone.guidelines.map(g => `  • ${g}`).join("\n")}`);
    }

    if (input.tone.blacklist?.length) {
      sections.push(`- NEVER use these words/phrases: ${input.tone.blacklist.join(", ")}`);
    }

    if (input.tone.must_include?.length) {
      sections.push(`- MUST include these: ${input.tone.must_include.join(", ")}`);
    }
  }

  // Additional context
  if (input.additional_context) {
    sections.push(`\n## Additional Context\n${input.additional_context}`);
  }

  return sections.join("\n");
}

/**
 * Selects relevant examples from the reference library based on ad type and platform.
 */
export function selectExamples(
  library: { examples: Array<Record<string, string>> },
  adType: string,
  platform: string,
  maxExamples: number = 3,
): Array<Record<string, string>> {
  // Prefer exact matches on both ad_type and platform
  const exactMatches = library.examples.filter(
    ex => ex.ad_type === adType && ex.platform === platform,
  );

  if (exactMatches.length >= maxExamples) {
    return exactMatches.slice(0, maxExamples);
  }

  // Fill with same ad_type, different platform
  const typeMatches = library.examples.filter(
    ex => ex.ad_type === adType && ex.platform !== platform,
  );

  return [...exactMatches, ...typeMatches].slice(0, maxExamples);
}

/**
 * Formats example ads for inclusion in the prompt as few-shot examples.
 */
export function formatExamplesBlock(examples: Array<Record<string, string>>): string {
  if (!examples.length) return "";

  const formatted = examples.map((ex, i) => {
    return `### Example ${i + 1} (${ex.platform}, targeting ${ex.target_role})
Headline: ${ex.headline}
Body: ${ex.body}
CTA: ${ex.cta}
Why it works: ${ex.why_it_works}`;
  }).join("\n\n");

  return `\n## Reference Examples — Study These for Quality and Style\n${formatted}`;
}

/**
 * Selects visual styles that are appropriate for the given ad type
 * and builds a prompt block that forces Claude to choose from them.
 */
export function buildVisualStylesBlock(
  visualLibrary: { visual_formats: Array<Record<string, unknown>> },
  adType: string,
  variationCount: number,
): string {
  // Filter to styles that work for this ad type
  const relevant = visualLibrary.visual_formats.filter((style) => {
    const worksBest = style.works_best_for as string[];
    return worksBest.includes(adType);
  });

  // If fewer relevant styles than variations, include all styles
  const styles = relevant.length >= variationCount ? relevant : visualLibrary.visual_formats;

  const formatted = styles.map((style) => {
    return `### ${style.name} (id: ${style.id})
${style.description}
- Layout: ${style.layout}
- Design notes: ${style.design_notes}
- Reference: ${style.example_reference}`;
  }).join("\n\n");

  return `
## Visual Style Library — YOU MUST CHOOSE FROM THESE
Each variation MUST use a DIFFERENT visual style from the list below. Do NOT default to split-screen layouts. Do NOT repeat the same visual approach across variations. Pick the style that best reinforces the copy's message.

${formatted}

RULES:
- Each variation must reference a different visual style by name in the visual_direction.concept field
- Use the style's layout guidance, design notes, and reference description to write specific visual_direction
- Adapt the style to the brand and audience — don't copy the reference literally
- If ${variationCount} variations are requested, use ${variationCount} different visual styles`;
}

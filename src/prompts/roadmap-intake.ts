/**
 * Prompts for extracting a full GeneratedRoadmapOutput from an existing roadmap document.
 *
 * Unlike the generate flow (which *creates* content from research), these prompts
 * *extract* existing content from a previously-generated roadmap PDF/document.
 *
 * Split into 2 calls because the full schema is very large (~250 lines of TS interfaces).
 */

interface IntakeContext {
  contract_name: string;
  industry: string;
  additional_notes?: string;
}

const INTAKE_SYSTEM_PROMPT = `You are a document parser that extracts structured JSON from marketing roadmap documents. Your job is to read the document and extract the content into the exact JSON schema specified.

Rules:
- Extract content WORD-FOR-WORD from the document wherever possible — do NOT fabricate, summarize, or embellish
- Return ONLY valid JSON matching the specified schema — no markdown code blocks, no explanations
- If a section is missing from the document, use reasonable empty defaults (empty arrays, empty strings)
- Preserve all data exactly as it appears: numbers, names, bullet points, descriptions
- Do NOT include section_description fields — those are injected separately during assembly`;

/**
 * Call 1: Extract sections 1-5
 * - title, summary (top-level)
 * - target_market (ICPs + empathy maps)
 * - brand_story (StoryBrand framework)
 * - products_and_solutions (product matrix)
 * - competition (competitor snapshots + scores)
 *
 * NOTE: overview is NOT extracted — it uses static boilerplate.
 */
export function buildRoadmapIntakePrompt_Part1(
  content: string,
  context: IntakeContext
): { system: string; user: string } {
  const user = `# Context
Client/Contract: ${context.contract_name}
Industry: ${context.industry}
${context.additional_notes ? `Notes: ${context.additional_notes}` : ""}

# Document to Extract From
${content}

---

# Task: Extract Sections 1-5 from this roadmap document

Extract the following into a single JSON object:

## Top-level fields
- \`title\`: The roadmap title (usually appears at the top of the document)
- \`summary\`: The executive summary paragraph (usually 2-3 sentences near the top)

## target_market
Extract all Ideal Customer Profiles. Each profile has:
- \`target_account\`: { name, description, location, industry, revenue, number_of_employees, technologies: string[], key_characteristics: string[] }
- \`empathy_map\`: { fictional_name, fictional_job_title, thinks, feels, says, does, sees, hears, pains, goals }

## brand_story
Extract the StoryBrand framework:
- \`character\`: { want }
- \`problem\`: { villain, external, internal, philosophical }
- \`guide\`: { empathy, authority }
- \`plan\`: { process, agreement }
- \`call_to_action\`: { direct, transitional }
- \`success\`: string[] (list of success outcomes)
- \`failure\`: string[] (list of failure consequences)
- \`transformation\`: { from, to }

## products_and_solutions
Extract the product/solution matrix:
- \`products\`: array of { product, helps_overcome, picture_of_success, helps_avoid_failure }

## competition
Extract competitor snapshots:
- \`competitors\`: array of { company_name, positioning_description, scores: { organic_seo, social_media, content_strategy, paid_media, brand_positioning, overall }, key_observations: string[] }

For competitor scores: extract numeric scores (0-100) if present in the document. If scores are not present, use 0 for all score fields.

Return as:
{
  "title": "...",
  "summary": "...",
  "target_market": { "profiles": [...] },
  "brand_story": { "character": {...}, "problem": {...}, "guide": {...}, "plan": {...}, "call_to_action": {...}, "success": [...], "failure": [...], "transformation": {...} },
  "products_and_solutions": { "products": [...] },
  "competition": { "competitors": [...] }
}

Return ONLY the JSON object. No other text.`;

  return { system: INTAKE_SYSTEM_PROMPT, user };
}

/**
 * Call 2: Extract sections 6-10
 * - goals (annual goal alignment)
 * - roadmap_phases (90-day phased execution)
 * - quarterly_initiatives (OKRs)
 * - annual_plan (Gantt-style 12-month plan)
 * - points_plan (monthly points allocation)
 */
export function buildRoadmapIntakePrompt_Part2(
  content: string,
  context: IntakeContext
): { system: string; user: string } {
  const user = `# Context
Client/Contract: ${context.contract_name}
Industry: ${context.industry}
${context.additional_notes ? `Notes: ${context.additional_notes}` : ""}

# Document to Extract From
${content}

---

# Task: Extract Sections 6-10 from this roadmap document

Extract the following into a single JSON object:

## goals
Extract the annual goal alignment:
- \`outcomes\`: array of { business_outcome, metric, description, benchmark, annual_goal, data_source }
- \`rationale\`: string[] (list of rationale bullet points explaining why these goals are appropriate)

## roadmap_phases
Extract the 90-day phased execution plan:
- \`phases\`: array of { name, timeframe, theme, deliverables: string[], milestone }

## quarterly_initiatives
Extract the OKRs:
- \`objectives\`: array of { objective, key_results: string[] }

## annual_plan
Extract the 12-month Gantt-style plan:
- \`categories\`: array of { category, initiatives: [{ initiative, description, months: [bool x 12] }] }

For the \`months\` array: extract a 12-element boolean array where true = active that month. If the document shows month names or checkmarks, map them to the correct positions (index 0 = Month 1 / January-ish, index 11 = Month 12). If months cannot be determined, default to all false.

## points_plan
Extract the points allocation:
- \`total_points\`: number (grand total across all months)
- \`months\`: array of { month, tasks: [{ task, description, stage: "Foundation" | "Execution" | "Analysis", points: number }], month_total: number }

For stage values: use exactly "Foundation", "Execution", or "Analysis". If the document uses different terminology, map to the closest match.

Return as:
{
  "goals": { "outcomes": [...], "rationale": [...] },
  "roadmap_phases": { "phases": [...] },
  "quarterly_initiatives": { "objectives": [...] },
  "annual_plan": { "categories": [...] },
  "points_plan": { "total_points": <number>, "months": [...] }
}

Return ONLY the JSON object. No other text.`;

  return { system: INTAKE_SYSTEM_PROMPT, user };
}

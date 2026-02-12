import { RoadmapInput } from "../types/roadmap-input";

// --- System Prompt ---

export const ROADMAP_SYSTEM_PROMPT = `You are a senior marketing strategist at a top-tier consultancy building a client's Marketing Roadmap — the strategic blueprint that turns research insights into an actionable 90-day execution plan.

Your approach combines TWO sources of insight:

1. **Research Data (provided)** — A comprehensive marketing research document covering market analysis, competitive landscape, customer insights, and competitive scoring. This is your evidence base.

2. **Meeting Transcripts (provided)** — Discovery sessions, kickoff meetings, and alignment calls with the client. These reveal the client's priorities, constraints, preferences, and business context that research alone cannot capture.

**When meetings and research conflict, meetings take priority.** The client's stated priorities and business reality override research recommendations.

Output rules:
- Return ONLY valid JSON matching the specified schema
- No markdown code blocks, no explanations, no meta-commentary — just raw JSON
- Every field must contain specific, client-relevant content — no placeholder text like "TBD" or "[insert here]"
- All descriptions, observations, and recommendations must be grounded in the research data and meeting context provided
- Write in a professional, strategic tone appropriate for a C-suite audience`;

// --- Shared Helpers ---

function buildContextBlock(input: RoadmapInput): string {
  const parts = [
    `# Client: ${input.client.company_name}`,
    `Domain: ${input.client.domain}`,
  ];

  if (input.instructions) {
    parts.push(`\n## Strategist Instructions\n${input.instructions}`);
  }

  return parts.join("\n");
}

function formatTranscripts(transcripts: string[]): string {
  if (!transcripts.length) return "";

  const parts = ["# Meeting Transcripts\n"];
  transcripts.forEach((transcript, i) => {
    parts.push(`## Transcript ${i + 1}\n`);
    parts.push(transcript);
    parts.push("\n---\n");
  });

  return parts.join("\n");
}

function summarizePriorResults(accumulated: Record<string, unknown>): string {
  const keys = Object.keys(accumulated);
  if (keys.length === 0) return "";

  const parts = ["# Prior Results (from earlier calls — maintain coherence)\n"];
  for (const key of keys) {
    const value = accumulated[key];
    const json = JSON.stringify(value, null, 2);
    // Truncate large sections to keep context manageable
    const truncated = json.length > 3000 ? json.slice(0, 3000) + "\n... (truncated)" : json;
    parts.push(`## ${key}\n\`\`\`json\n${truncated}\n\`\`\`\n`);
  }

  return parts.join("\n");
}

function formatPreviousRoadmap(
  previousRoadmap: Record<string, unknown> | undefined,
  sectionKeys: string[],
  guidance: string
): string {
  if (!previousRoadmap) return "";

  const parts = [
    "# Previous Quarter's Roadmap (for continuity)\n",
    "You are building a QUARTERLY UPDATE to an existing roadmap. The previous version's relevant sections are below. Evolve it — don't regenerate from scratch. Maintain continuity where appropriate, and make fresh strategic choices where indicated.\n",
  ];

  for (const key of sectionKeys) {
    const value = previousRoadmap[key];
    if (value === undefined) continue;
    const json = JSON.stringify(value, null, 2);
    const truncated =
      json.length > 3000 ? json.slice(0, 3000) + "\n... (truncated)" : json;
    parts.push(`## Previous ${key}\n\`\`\`json\n${truncated}\n\`\`\`\n`);
  }

  parts.push(`## Evolution Guidance\n${guidance}\n`);

  return parts.join("\n");
}

// --- Prompt Builders ---

/**
 * Call 1: Target Market (ICPs + Empathy Maps) + Brand Story (StoryBrand)
 * Foundational call — personas inform everything downstream.
 */
export function buildTargetMarketAndBrandStoryPrompt(
  input: RoadmapInput
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const transcripts = formatTranscripts(input.transcripts);
  const previousContext = formatPreviousRoadmap(
    input.previous_roadmap as Record<string, unknown> | undefined,
    ["target_market", "brand_story"],
    "Refine and evolve these — don't start from scratch. Keep ICPs stable unless research/meetings indicate a shift. Update the brand story only if positioning has changed."
  );

  const user = `${context}

${transcripts}

${previousContext}

# Research Document
${input.research.full_document_markdown.slice(0, 40000)}

---

# Task: Generate Target Market Profiles + Brand Story

Generate a JSON object with two top-level keys: \`target_market\` and \`brand_story\`.

## target_market

Create 2-3 Ideal Customer Profiles (ICPs). Each profile has:
- \`target_account\`: An ideal target account with name, description (30-40 words), location, industry, revenue range, number_of_employees range, technologies array, and key_characteristics array (3-5 bullets)
- \`empathy_map\`: A fictional persona with fictional_name, fictional_job_title, and empathy dimensions: thinks, feels, says, does, sees, hears, pains, goals (each 1-2 sentences)

Ground personas in the research data and meeting transcripts. If meetings mention specific buyer types, industries, or pain points, those take priority.

Return as:
\`\`\`
{
  "target_market": {
    "profiles": [
      {
        "target_account": { "name": "...", "description": "...", "location": "...", "industry": "...", "revenue": "...", "number_of_employees": "...", "technologies": [...], "key_characteristics": [...] },
        "empathy_map": { "fictional_name": "...", "fictional_job_title": "...", "thinks": "...", "feels": "...", "says": "...", "does": "...", "sees": "...", "hears": "...", "pains": "...", "goals": "..." }
      }
    ]
  },
  "brand_story": {
    "character": { "want": "..." },
    "problem": { "villain": "...", "external": "...", "internal": "...", "philosophical": "..." },
    "guide": { "empathy": "...", "authority": "..." },
    "plan": { "process": "...", "agreement": "..." },
    "call_to_action": { "direct": "...", "transitional": "..." },
    "success": ["...", "...", "...", "..."],
    "failure": ["...", "..."],
    "transformation": { "from": "...", "to": "..." }
  }
}
\`\`\`

## brand_story

Follow the StoryBrand framework:
- **character.want**: What the customer ultimately wants (drawn from research + meetings)
- **problem**: villain (the root obstacle), external (tangible problem), internal (how it makes them feel), philosophical (why it's wrong on a deeper level)
- **guide**: empathy (how the brand understands their struggle), authority (proof the brand can help)
- **plan**: process (the clear steps), agreement (the guarantee or commitment)
- **call_to_action**: direct (primary CTA), transitional (secondary/nurture CTA)
- **success**: 4-5 specific outcomes when the customer succeeds
- **failure**: 2-3 specific consequences if the customer does nothing
- **transformation**: from (before state) → to (after state)

Return ONLY the JSON object. No other text.`;

  return { system: ROADMAP_SYSTEM_PROMPT, user };
}

/**
 * Call 2: Products & Solutions Matrix + Competition Snapshots
 * Competition: generates positioning_description + key_observations only —
 * scores are passthrough from research (NOT sent to Claude).
 */
export function buildProductsAndCompetitionPrompt(
  input: RoadmapInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const transcripts = formatTranscripts(input.transcripts);
  const priorResults = summarizePriorResults(accumulated);
  const previousContext = formatPreviousRoadmap(
    input.previous_roadmap as Record<string, unknown> | undefined,
    ["products_and_solutions", "competition"],
    "Update the product matrix if offerings have changed. Refresh competitor observations with new data. Maintain consistency with prior positioning unless the market has shifted."
  );

  // Extract competitor names from research scores
  const competitorNames = Object.keys(input.research.competitive_scores);

  const user = `${context}

${transcripts}

${priorResults}

${previousContext}

# Research Document
${input.research.full_document_markdown.slice(0, 40000)}

---

# Task: Generate Products & Solutions + Competition Snapshots

Generate a JSON object with two top-level keys: \`products_and_solutions\` and \`competition\`.

## products_and_solutions

Identify the client's key products/solutions from the research and meetings. For each product:
- \`product\`: Product or solution name
- \`helps_overcome\`: 50-75 words on what challenges this helps overcome
- \`picture_of_success\`: 50-75 words on what success looks like
- \`helps_avoid_failure\`: 50-75 words on what failure it helps avoid

Align with the StoryBrand framework from the prior call — each product maps to specific customer problems.

## competition

Competitors to analyze: ${competitorNames.join(", ")}

For each competitor, generate:
- \`company_name\`: Exact company name (must match the names above)
- \`positioning_description\`: 50-75 word summary of their market positioning
- \`key_observations\`: 4-5 observations (10-15 words each) across all marketing dimensions

**Do NOT generate scores** — scores will be injected from the research data during assembly.

Return as:
\`\`\`
{
  "products_and_solutions": {
    "products": [
      { "product": "...", "helps_overcome": "...", "picture_of_success": "...", "helps_avoid_failure": "..." }
    ]
  },
  "competition": {
    "competitors": [
      { "company_name": "...", "positioning_description": "...", "key_observations": ["...", "...", "...", "..."] }
    ]
  }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: ROADMAP_SYSTEM_PROMPT, user };
}

/**
 * Call 3: Goals + Roadmap Phases + Quarterly Initiatives (OKRs)
 * Most strategic call — builds on personas, products, and competitive position.
 */
export function buildGoalsAndStrategyPrompt(
  input: RoadmapInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const transcripts = formatTranscripts(input.transcripts);
  const priorResults = summarizePriorResults(accumulated);
  const previousContext = formatPreviousRoadmap(
    input.previous_roadmap as Record<string, unknown> | undefined,
    ["goals", "roadmap_phases", "quarterly_initiatives"],
    "Update goal benchmarks based on progress. Generate FRESH roadmap phases and OKRs for the new quarter — these should not repeat the previous quarter. Build on momentum from prior phases."
  );

  const user = `${context}

${transcripts}

${priorResults}

${previousContext}

# Research Document
${input.research.full_document_markdown.slice(0, 25000)}

---

# Task: Generate Goals + Roadmap Phases + Quarterly Initiatives

Generate a JSON object with three top-level keys: \`goals\`, \`roadmap_phases\`, and \`quarterly_initiatives\`.

## goals

Define 1-2 primary business outcomes. For each:
- \`business_outcome\`: The primary outcome (e.g., "Pipeline Growth", "Brand Awareness")
- \`metric\`: The specific KPI (e.g., "Marketing Qualified Leads (MQLs)")
- \`description\`: How this metric will be tracked and what it represents
- \`benchmark\`: Current baseline from research/meetings
- \`annual_goal\`: Specific, measurable annual target
- \`data_source\`: Where this data will be tracked

Also provide \`rationale\`: 5 bullet points explaining why these goals are appropriate given the client's stage, capacity, and growth trajectory.

## roadmap_phases

Create 3 monthly phases for 90-day execution. Each phase:
- \`name\`: e.g., "Month 1: Foundation & Setup"
- \`timeframe\`: e.g., "March 2026"
- \`theme\`: The strategic theme for this phase
- \`deliverables\`: Key deliverables completed in this phase (4-6 items)
- \`milestone\`: What success looks like at the end of this phase

Phases should build logically: foundation → execution → optimization.

## quarterly_initiatives

Create 3-5 Objectives and Key Results (OKRs). Each:
- \`objective\`: A clear, ambitious goal for the quarter
- \`key_results\`: 2-3 specific, measurable key results

OKRs should address competitive gaps, target the ICPs from prior calls, and align with the goals above.

Return as:
\`\`\`
{
  "goals": {
    "outcomes": [
      { "business_outcome": "...", "metric": "...", "description": "...", "benchmark": "...", "annual_goal": "...", "data_source": "..." }
    ],
    "rationale": ["...", "...", "...", "...", "..."]
  },
  "roadmap_phases": {
    "phases": [
      { "name": "...", "timeframe": "...", "theme": "...", "deliverables": ["..."], "milestone": "..." }
    ]
  },
  "quarterly_initiatives": {
    "objectives": [
      { "objective": "...", "key_results": ["...", "..."] }
    ]
  }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: ROADMAP_SYSTEM_PROMPT, user };
}

/**
 * Call 4: Annual Plan (Gantt) + Points Plan (deliverable allocation)
 * Claude SELECTS from the process library and ALLOCATES across 3 months within budget.
 */
export function buildAnnualAndPointsPlanPrompt(
  input: RoadmapInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorResults = summarizePriorResults(accumulated);
  const previousContext = formatPreviousRoadmap(
    input.previous_roadmap as Record<string, unknown> | undefined,
    ["annual_plan", "points_plan"],
    "Shift the annual plan timeline forward. Adjust initiatives based on what worked and what didn't. Generate a FRESH points allocation for the new quarter."
  );

  // Format process library as a menu for Claude to select from
  const processMenu = input.process_library
    .map(
      (p) =>
        `- ${p.task} (${p.stage}, ${p.points} pts): ${p.description}`
    )
    .join("\n");

  const user = `${context}

${priorResults}

${previousContext}

# Process Library (available deliverables to select from)
${processMenu}

# Points Budget: ${input.points_budget} points (across 3 months)

---

# Task: Generate Annual Plan + Points Plan

Generate a JSON object with two top-level keys: \`annual_plan\` and \`points_plan\`.

## annual_plan

Create a 12-month Gantt-style plan organized by category. Typical categories: "Content Initiatives", "Demand Generation", "Sales Enablement", "Brand & Positioning", "Events & Partnerships", etc.

For each initiative:
- \`initiative\`: Name of the initiative
- \`description\`: Brief description
- \`months\`: 12-element boolean array (index 0 = Month 1, index 11 = Month 12). true = active that month.

The first 3 months should align with the roadmap phases from the prior call. Months 4-12 should project forward based on the strategic direction.

Create 3-5 categories with 2-4 initiatives each.

## points_plan

Select deliverables from the Process Library above and allocate across 3 months. Rules:
- Only select tasks that exist in the Process Library — use exact task names
- Total points across all 3 months must not exceed the budget of ${input.points_budget} points
- Month 1 should focus on Foundation-stage tasks
- Month 2 should ramp into Execution-stage tasks
- Month 3 should include Analysis-stage tasks alongside continued execution
- Each month should have a balanced workload

For each month:
- \`month\`: e.g., "Month 1" or a specific month name
- \`tasks\`: Array of selected tasks with exact task name, description, stage, and points from the library
- \`month_total\`: Sum of points for that month

Also include \`total_points\`: the total points allocated (should be <= ${input.points_budget}).

Return as:
\`\`\`
{
  "annual_plan": {
    "categories": [
      {
        "category": "...",
        "initiatives": [
          { "initiative": "...", "description": "...", "months": [true, true, true, false, false, false, false, false, false, false, false, false] }
        ]
      }
    ]
  },
  "points_plan": {
    "total_points": <number>,
    "months": [
      {
        "month": "Month 1",
        "tasks": [
          { "task": "...", "description": "...", "stage": "Foundation", "points": <number> }
        ],
        "month_total": <number>
      }
    ]
  }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: ROADMAP_SYSTEM_PROMPT, user };
}

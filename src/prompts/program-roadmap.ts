import {
  ProgramRoadmapInput,
  RoadmapOption,
  ProcessLibraryHoursEntry,
  libraryForOption,
  isOverheadCategory,
} from "../types/program-roadmap-input";
import { TIER_COMMITMENT_LADDER } from "../types/program-roadmap-output";

/**
 * Program Roadmap prompts — 2 shared calls + one per option + executive summary.
 *
 * Spec: docs/program-roadmap-spec.md (v6)
 */

export const PROGRAM_ROADMAP_SYSTEM_PROMPT = `You are a senior marketing strategist at a top-tier consultancy building a client's Program Roadmap — a priced scope of work that turns research insights into an executable plan.

Your approach combines TWO sources of insight:

1. **Research Data (provided)** — A comprehensive marketing research document covering market analysis, competitive landscape, customer insights, and competitive scoring. This is your evidence base.

2. **Meeting Transcripts (provided)** — Discovery sessions, kickoff meetings, and alignment calls with the client. These reveal the client's priorities, constraints, preferences, and business context that research alone cannot capture.

**When meetings and research conflict, meetings take priority.** The client's stated priorities and business reality override research recommendations.

This roadmap is priced in HOURS, not points, and presents the client with one to three priced options they choose between. The options are alternatives — never phases, never summed.

Output rules:
- Return ONLY valid JSON matching the specified schema
- No markdown code blocks, no explanations, no meta-commentary — just raw JSON
- Every field must contain specific, client-relevant content — no placeholder text like "TBD" or "[insert here]"
- All descriptions, observations, and recommendations must be grounded in the research data and meeting context provided
- Write in a professional, strategic tone appropriate for a C-suite audience
- Never write a \`section_description\` — those are injected during assembly`;

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

function buildContextBlock(input: ProgramRoadmapInput): string {
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
    parts.push(`## Transcript ${i + 1}\n`, transcript, "\n---\n");
  });
  return parts.join("\n");
}

function truncateJson(value: unknown, limit = 3000): string {
  const json = JSON.stringify(value, null, 2);
  return json.length > limit ? json.slice(0, limit) + "\n... (truncated)" : json;
}

function summarizePriorResults(accumulated: Record<string, unknown>): string {
  const keys = Object.keys(accumulated);
  if (keys.length === 0) return "";
  const parts = ["# Prior Results (from earlier calls — maintain coherence)\n"];
  for (const key of keys) {
    parts.push(`## ${key}\n\`\`\`json\n${truncateJson(accumulated[key])}\n\`\`\`\n`);
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
    "You are building a QUARTERLY UPDATE to an existing roadmap. The previous version's relevant sections are below. Evolve it — don't regenerate from scratch.\n",
  ];
  for (const key of sectionKeys) {
    const value = previousRoadmap[key];
    if (value === undefined) continue;
    parts.push(`## Previous ${key}\n\`\`\`json\n${truncateJson(value)}\n\`\`\`\n`);
  }
  parts.push(`## Evolution Guidance\n${guidance}\n`);
  return parts.join("\n");
}

// ─────────────────────────────────────────────
// Call 1: Target Market + Brand Story (shared)
// ─────────────────────────────────────────────

export function buildSharedCall1Prompt(input: ProgramRoadmapInput): {
  system: string;
  user: string;
} {
  const user = `${buildContextBlock(input)}

${formatTranscripts(input.transcripts)}

${formatPreviousRoadmap(
  input.previous_roadmap as Record<string, unknown> | undefined,
  ["target_market", "brand_story"],
  "Keep ICPs stable unless research or meetings indicate a shift. Update the brand story only if positioning has changed."
)}

# Research Document
${input.research.full_document_markdown.slice(0, 40000)}

---

# Task: Generate Target Market Profiles + Brand Story

These sections describe the CLIENT, not the investment. They are generated once and are
identical across every priced option.

## target_market

Create 2-3 Ideal Customer Profiles (ICPs). Each profile has:
- \`target_account\`: name (a descriptive label for the account TYPE — e.g. "Enterprise Manufacturing Leaders" — NOT a fictional company name), description (30-40 words), location, industry, revenue range, number_of_employees range, technologies array, key_characteristics array (3-5 bullets)
- \`empathy_map\`: fictional_name, fictional_job_title, and empathy dimensions thinks, feels, says, does, sees, hears, pains, goals (each 1-2 sentences)

## brand_story

Follow the StoryBrand framework:
- **character.want**: What the customer ultimately wants
- **problem**: villain, external, internal, philosophical
- **guide**: empathy, authority
- **plan**: process, agreement
- **call_to_action**: direct, transitional
- **success**: 4-5 specific outcomes
- **failure**: 2-3 specific consequences
- **transformation**: from → to

Return exactly:
\`\`\`
{
  "target_market": { "profiles": [ { "target_account": {...}, "empathy_map": {...} } ] },
  "brand_story": { "character": {...}, "problem": {...}, "guide": {...}, "plan": {...}, "call_to_action": {...}, "success": [...], "failure": [...], "transformation": {...} }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: PROGRAM_ROADMAP_SYSTEM_PROMPT, user };
}

// ─────────────────────────────────────────────
// Call 2: Products & Competition (shared)
// ─────────────────────────────────────────────

export function buildSharedCall2Prompt(
  input: ProgramRoadmapInput,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const competitorNames = Object.keys(input.research.competitive_scores);

  const user = `${buildContextBlock(input)}

${formatTranscripts(input.transcripts)}

${summarizePriorResults(accumulated)}

${formatPreviousRoadmap(
  input.previous_roadmap as Record<string, unknown> | undefined,
  ["products_and_solutions", "competition"],
  "Update the product matrix if offerings have changed. Refresh competitor observations with new data."
)}

# Research Document
${input.research.full_document_markdown.slice(0, 40000)}

---

# Task: Generate Products & Solutions + Competition Snapshots

Shared sections — generated once, identical across every option.

## products_and_solutions

The client's core products or services — what they SELL. Do NOT include marketing tactics,
lead magnets, or campaign assets (eBooks, ROI calculators, webinars); those are vehicles,
not products. For each: \`product\`, \`helps_overcome\` (50-75 words), \`picture_of_success\`
(50-75 words), \`helps_avoid_failure\` (50-75 words). Align with the StoryBrand framework
from the prior call.

## competition

Competitors to analyze: ${competitorNames.join(", ")}

For each: \`company_name\` (must match exactly), \`positioning_description\` (50-75 words),
\`key_observations\` (4-5 observations, 10-15 words each).

**Do NOT generate scores** — they are injected from research during assembly.

Return exactly:
\`\`\`
{
  "products_and_solutions": { "products": [ { "product": "...", "helps_overcome": "...", "picture_of_success": "...", "helps_avoid_failure": "..." } ] },
  "competition": { "competitors": [ { "company_name": "...", "positioning_description": "...", "key_observations": ["..."] } ] }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: PROGRAM_ROADMAP_SYSTEM_PROMPT, user };
}

// ─────────────────────────────────────────────
// Execute archetypes — four classes
// ─────────────────────────────────────────────

/**
 * Execute is one program run deliberately narrow, not one program spread across its
 * eligible categories. Free composition at 22.2 program hours gives each of Authority's
 * five categories about four hours and produces nothing, so Execute generates from a
 * named shape.
 *
 * Four classes, because a flat task list leaves the generator guessing which rows are
 * fixed and which flex — and it will guess differently between two options in the same
 * document.
 *
 * Pursuit has no Execute archetype: it is refused at that tier before generation.
 */
const EXECUTE_ARCHETYPES: Record<string, string> = {
  authority: `**Execute / Authority — the client needs content produced**

| Class | Cadence | Tasks |
|---|---|---|
| setup | months 1-2, as capacity allows | The relevant \`Develop — Plan Document\` for the categories in play (e.g. Develop Content Plan Document ~18.75h) |
| overhead | every month | Facilitate Client Meetings 5.00 |
| recurring | every month | Manage content 0.75 · Manage SEO 5.00 · Manage performance reporting 1.00 |
| production | scales to fill | Develop SEO blog post 5.08 · Optimize existing SEO article 4.58 |`,

  reach: `**Execute / Reach — the client already has content and needs paid run**

| Class | Cadence | Tasks |
|---|---|---|
| setup | months 1-2, as capacity allows | Set up paid media 5.5 · Set up performance reporting 7.0 · optionally Develop Paid Media Plan Document 16.0 |
| overhead | every month | Facilitate Client Meetings 5.00 |
| recurring | every month | Manage paid media 4.00 · Manage performance reporting 1.00 |
| production | scales to fill | Develop Google Ads text ad creative package 5.33 · Develop image ad creative package 9.83 |`,
};

function archetypeGuidance(option: RoadmapOption): string {
  if (option.tier !== "execute") {
    const breadth =
      option.tier === "perform"
        ? "Perform composes more freely within its two programs."
        : "Grow can run full breadth across its programs.";
    return `## Composition at ${option.tier}

${breadth} There is no fixed archetype — compose from the library against the research and
the client's stated priorities. The rules below about setup, overhead, recurring work and
production scaling still apply: setup lands in months 1-2, coordination is planned every
month, and every month should use close to its full capacity.`;
  }

  const shape = EXECUTE_ARCHETYPES[option.programs[0]];

  return `## Composition at Execute — generate from the named shape

Execute is one program run **deliberately narrow**, not one program spread across its
eligible categories. Free composition at this capacity gives every category about four
hours and produces nothing.

${shape ?? "Compose narrowly: no more than four rolled-up service categories across the plan."}

**Use this shape.** Draw the exact tasks above from the process library where they exist.
You may substitute a closely equivalent library item when the research clearly calls for
one, but do not widen beyond four rolled-up service categories across the plan.`;
}

// ─────────────────────────────────────────────
// Calls 3..3+N: one per option
// ─────────────────────────────────────────────

function formatLibrary(items: ProcessLibraryHoursEntry[]): string {
  const overhead = items.filter((i) => isOverheadCategory(i.service_category));
  const program = items.filter((i) => !isOverheadCategory(i.service_category));

  const render = (entry: ProcessLibraryHoursEntry) =>
    `- ${entry.task} — ${entry.baseline_hours}h · ${entry.stage} · ${entry.service_category}: ${entry.description}`;

  const parts = ["## Program work (eligible for this option's programs)"];
  parts.push(program.map(render).join("\n"));

  if (overhead.length) {
    parts.push(
      "\n## Strategy & account management (always available, plan these as rows)"
    );
    parts.push(overhead.map(render).join("\n"));
  }

  return parts.join("\n");
}

function formatPriorOptions(
  priorOptions: Array<{ option: RoadmapOption; goals: unknown }>
): string {
  if (!priorOptions.length) return "";

  const parts = [
    "# Options already generated for this roadmap (lower tiers)\n",
    "This option must sit ABOVE these on the accountability ladder. Its goals must be strictly more ambitious — never equal, never lower — and its plan must visibly buy more than they do.\n",
  ];

  for (const prior of priorOptions) {
    parts.push(
      `## ${prior.option.label} (${prior.option.tier}, ${prior.option.hours_available} hrs/month)`
    );
    parts.push(`\`\`\`json\n${truncateJson(prior.goals, 2000)}\n\`\`\`\n`);
  }

  return parts.join("\n");
}

export function buildOptionPrompt(
  input: ProgramRoadmapInput,
  option: RoadmapOption,
  accumulated: Record<string, unknown>,
  priorOptions: Array<{ option: RoadmapOption; goals: unknown }>
): { system: string; user: string } {
  const library = libraryForOption(
    input.process_library_hours,
    option,
    input.program_matrix
  );

  const permitted = TIER_COMMITMENT_LADDER[option.tier];
  const allocationLines = Object.entries(option.program_allocation)
    .map(([category, program]) => `- ${category} → ${program}`)
    .join("\n");

  const termLine =
    option.term_months || option.commitment
      ? `\nProposed term: ${option.term_months ?? "unspecified"} months, ${
          option.commitment ?? "unspecified"
        } commitment. Reflect this in how the phases describe the arc of the engagement — do not treat the priced quarter as simply repeating for the whole term.`
      : "";

  const notesLine = option.notes ? `\nStrategist notes: ${option.notes}` : "";

  const user = `${buildContextBlock(input)}

${summarizePriorResults(accumulated)}

${formatPriorOptions(priorOptions)}

${formatPreviousRoadmap(
  input.previous_roadmap as Record<string, unknown> | undefined,
  ["goals", "roadmap_phases", "quarterly_initiatives", "annual_plan", "hours_plan"],
  "Update goal benchmarks based on progress. Generate FRESH phases and OKRs for the new quarter."
)}

# Research Document
${input.research.full_document_markdown.slice(0, 25000)}

---

# Task: Generate the plan for ONE option

## This option

| | |
|---|---|
| Label | ${option.label} |
| Tier | ${option.tier} |
| Programs | ${option.programs.join(", ")} |
| Monthly services fee | $${option.monthly_budget.toLocaleString()} |
| Technology (billed separately, never consumes hours) | $${option.technology_monthly.toLocaleString()}/mo |
| Total monthly investment | $${option.total_monthly.toLocaleString()} |
| **Capacity — what this plan spends** | **${option.hours_available} hrs/month** |
| Typical coordination within that | ~${option.overhead_hours} hrs/month |
| Guideline non-coordination hours | ~${option.program_hours} hrs/month |
${termLine}${notesLine}

**Allocate against the full ${option.hours_available} hours.** Strategy and account
management are billed to tasks like any other work — plan them as rows with
\`"program": "overhead"\`. Nothing is reserved or added afterwards. A well-composed month
spends close to all ${option.hours_available} hours, of which roughly ${option.overhead_hours}
go to coordination.

**Technology never consumes hours.** It is billed separately and never appears as a row.

## Program allocation for this option

Every non-overhead row's \`program\` is taken from this map — it is not an independent
choice:

${allocationLines}

Overhead rows carry \`"program": "overhead"\`.

${archetypeGuidance(option)}

## Process library available to this option

Only these items. Use exact task names and take \`baseline_hours\` from here.

${formatLibrary(library)}

## Hours: baseline versus scheduled

Every row carries both \`baseline_hours\` (from the library, never changed) and \`hours\`
(what you are scheduling). **You may deviate from baseline where the research or the
instructions justify it** — three systems and custom attribution should push "Manage
performance reporting" well above its 1-hour baseline. When you deviate, set \`hours\` and
write a specific \`adjustment_reason\` explaining what about THIS client changes the
estimate. When you do not deviate, \`hours\` equals \`baseline_hours\` and
\`adjustment_reason\` is null.

Do not write an adjustment_reason that only restates the hours. It is the signal used to
correct the library from real use, so it must say what is different about this engagement.

## The three months

**Month 1 is the ramp.** Setup work lands in months 1-2 as capacity allows — a plan
document may be split across the two as work in progress. Month one still allocates to a
normal percentage of capacity, because setup and planning fill the hours; what it ships is
fewer deliverables than a steady month. Say so plainly in the month-1 phase text so the SOW
can carry it. Do not describe month one as under-resourced — describe it as foundation.

**Months 2-3 are steady state**, and every month should use close to its full capacity.
Production work scales to fill: if the fixed shape leaves hours unspent, add more production
of the same kind rather than adding new categories.

## What to generate

### goals
1-2 primary business outcomes. Each carries:
- \`business_outcome\`, \`metric\`, \`description\`, \`benchmark\`, \`annual_goal\`, \`data_source\`
- \`commitment_type\`: one of ${permitted.map((c) => `\`${c}\``).join(", ")}

**This option is ${option.tier}, so it may ONLY promise: ${permitted.join(", ")}.**
- \`output\` — things delivered. "24 published articles, 12 optimized."
- \`leading_indicator\` — metrics we control and move. Organic sessions, MQL volume, CPL.
- \`business_outcome\` — owned outcomes with the measurement behind them. Pipeline sourced, with attribution owned.

What you can commit to depends on what is bought. Do not promise a result this investment
cannot be held to.

\`benchmark\` must come from the research and be the SAME baseline any other option would
cite — only the targets differ between options.

Also provide \`rationale\`: 5 bullets on why these goals fit this client at this investment.

### roadmap_phases
3 phases across 90 days. Each: \`name\`, \`timeframe\`, \`theme\`, \`deliverables\` (4-6),
\`milestone\`. Phase 1 must name the ramp.

### quarterly_initiatives
3-5 OKRs. Each: \`objective\`, \`key_results\` (2-3 measurable).

### annual_plan — the 12-month Gantt
3-5 categories, 2-4 initiatives each. Each initiative: \`initiative\`, \`description\`,
\`months\` (12 booleans, index 0 = month 1).

Months 4-12 are **directional continuation of the same shape**. They are not priced and
must not imply committed volume. Do not introduce any category that the priced quarter
does not contain.

### hours_plan — the priced quarter
Three months of task rows.

For each month: \`month\` (1, 2, 3), \`month_label\` ("Month 1"), \`hours_available\`
(${option.hours_available}), \`hours_allocated\` (sum of the month's \`hours\`),
\`overhead_hours_allocated\` (sum of rows where program is "overhead"), \`tasks\`, and
\`flags\` (always an empty array — flags are attached after generation).

Each task row:
\`\`\`
{
  "task": "exact library task name",
  "description": "what this delivers for THIS client, specifically",
  "stage": "Foundation" | "Execution" | "Analysis",
  "service_category": "from the library",
  "program": "authority" | "reach" | "pursuit" | "overhead",
  "process_id": null,
  "baseline_hours": <from library>,
  "hours": <what you schedule>,
  "adjustment_reason": <string or null>,
  "flags": []
}
\`\`\`

Then \`total_hours_allocated\` (sum across the three months) and
\`total_hours_available\` (${option.hours_available} × 3 = ${(option.hours_available * 3).toFixed(1)}).

**Hard rule: no month's \`hours_allocated\` may exceed ${option.hours_available}.** Check
each month's arithmetic before returning.

Return exactly:
\`\`\`
{
  "goals": { "outcomes": [...], "rationale": [...] },
  "roadmap_phases": { "phases": [...] },
  "quarterly_initiatives": { "objectives": [...] },
  "annual_plan": { "categories": [...] },
  "hours_plan": { "total_hours_allocated": <n>, "total_hours_available": <n>, "months": [...] }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: PROGRAM_ROADMAP_SYSTEM_PROMPT, user };
}

// ─────────────────────────────────────────────
// Final call: executive summary + recommendation
// ─────────────────────────────────────────────

export function buildExecutiveSummaryPrompt(
  input: ProgramRoadmapInput,
  generatedOptions: Array<{ option: RoadmapOption; goals: unknown }>,
  recommendedOptionId: string,
  accumulated: Record<string, unknown>
): { system: string; user: string } {
  const recommended = generatedOptions.find(
    (o) => o.option.option_id === recommendedOptionId
  );

  const optionBlocks = generatedOptions
    .map(
      ({ option, goals }) => `### ${option.label} — \`${option.option_id}\`
- Tier: ${option.tier} · Programs: ${option.programs.join(", ")}
- Services $${option.monthly_budget.toLocaleString()}/mo · Technology $${option.technology_monthly.toLocaleString()}/mo · **Total $${option.total_monthly.toLocaleString()}/mo**
- Capacity ${option.hours_available} hrs/month
- Goals: \`\`\`json
${truncateJson(goals, 1500)}
\`\`\``
    )
    .join("\n\n");

  const user = `${buildContextBlock(input)}

${summarizePriorResults(accumulated)}

# The options, as generated

${optionBlocks}

# The strategist's recommendation

**${recommended?.option.label ?? recommendedOptionId}** (\`${recommendedOptionId}\`) is the
recommended option. That choice is already made — your job is to write the case for it, not
to reconsider it.

---

# Task: Generate the executive summary

## summary
2-3 sentences describing this roadmap. Names the client and what the engagement is for.

## executive_summary.body
4-6 paragraphs. What the research and conversations point to, what the client's situation
demands, and what each option buys. Name every option and what distinguishes it — different
levels of commitment, not different amounts of the same promise.

The options are **alternatives**. Never sum them, never describe them as phases or stages,
and never imply the client buys more than one.

## executive_summary.recommendation_rationale
2-3 paragraphs making the case for ${recommended?.option.label ?? recommendedOptionId}.

**End on a determination, not a menu.** Quote the TOTAL monthly investment — services plus
technology — because that is the number the client decides on. For example: "Your roadmap
requires $${recommended?.option.monthly_budget.toLocaleString() ?? "X"} a month in services
plus roughly $${recommended?.option.technology_monthly.toLocaleString() ?? "Y"} in platform.
That's ${recommended?.option.label ?? "the recommended option"}."

Say what the recommended option commits to that the cheaper ones cannot, and what the more
expensive one would add that this client does not yet need. Both halves earn the
recommendation.

Return exactly:
\`\`\`
{
  "summary": "...",
  "executive_summary": {
    "body": "...",
    "recommended_option_id": "${recommendedOptionId}",
    "recommendation_rationale": "..."
  }
}
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: PROGRAM_ROADMAP_SYSTEM_PROMPT, user };
}

// ─────────────────────────────────────────────
// Repair prompt — over-capacity months
// ─────────────────────────────────────────────

export function buildCapacityRepairPrompt(
  option: RoadmapOption,
  offendingMonths: Array<{ month: number; allocated: number }>,
  previousHoursPlan: unknown
): { system: string; user: string } {
  const overages = offendingMonths
    .map(
      (m) =>
        `- Month ${m.month}: ${m.allocated.toFixed(2)} allocated against ${
          option.hours_available
        } available — over by ${(m.allocated - option.hours_available).toFixed(2)}`
    )
    .join("\n");

  const user = `The hours plan you generated for **${option.label}** puts at least one month
over capacity. Capacity is ${option.hours_available} hours per month and is a hard ceiling.

${overages}

Here is the plan you returned:

\`\`\`json
${JSON.stringify(previousHoursPlan, null, 2)}
\`\`\`

Fix ONLY the over-capacity months. Prefer, in this order:
1. Move a setup or plan-document row into month 2 where it fits (setup may span months 1-2)
2. Drop a production row — production scales to fill, so it is what flexes
3. Reduce a production row's hours and write an \`adjustment_reason\` saying what narrows

Do not reduce coordination below what the other months carry, and do not drop recurring
management rows — those are what keeps the work running.

Every month must still allocate close to its full ${option.hours_available} hours. Recompute
\`hours_allocated\`, \`overhead_hours_allocated\`, \`total_hours_allocated\` and
\`total_hours_available\` so the arithmetic is correct.

Return ONLY the corrected \`hours_plan\` object:
\`\`\`
{ "total_hours_allocated": <n>, "total_hours_available": <n>, "months": [...] }
\`\`\`

Return ONLY the JSON object. No other text.`;

  return { system: PROGRAM_ROADMAP_SYSTEM_PROMPT, user };
}

import { MessagingPlanInput } from "../types/messaging-plan-input";

// --- System Prompt ---

export const MESSAGING_PLAN_SYSTEM_PROMPT = `You are a senior brand strategist and StoryBrand Certified Guide producing a premium Brand Messaging Plan — the final deliverable a strategist hands directly to a client. This is not a summary or a worksheet. It is a polished, client-ready messaging document built on the StoryBrand 7-part brand story framework.

Your job is to synthesize the provided context (competitive research, brand-story / kickoff meeting transcripts, and any roadmap context) into a single, coherent, deeply specific messaging plan that a client could put to work immediately.

How to use the inputs:
- **Research** is the primary grounding for the Market Opportunity and Positioning sections. Name real competitors and identify the uncontested space the client can own.
- **Transcripts** are the primary source for the Brand Story (the customer, the villain, their problems, empathy/authority) and for the brand's actual voice. Pull real phrases, pain points, and quotes from them.
- **Roadmap** is background context only — what the engagement is executing. Never required.
- **Instructions** are strategist overrides — honor them above all else.

Writing standards:
- Write in confident, client-ready prose. This is a finished deliverable, not a draft.
- Be specific and concrete. Use real competitor names, real numbers from the research, and direct language from the transcripts wherever they exist.
- Fill in every section with client-specific content. Do NOT leave bracketed placeholders unless a fact is genuinely unavailable — if a fact is truly missing, flag it inline as \`[PLACEHOLDER — owner to provide: …]\`.
- The StoryBrand arc is the spine: the customer is the hero, the brand is the guide.
- Use markdown tables where the template calls for them (Products & Solutions Matrix, etc.).
- NEVER use # (h1) — that heading level is reserved for the document title added during assembly. Use ## for the numbered top-level sections, ### for sub-sections, #### for finer breakdowns.

Output markdown only. No JSON wrapping. No meta-commentary about the task. Start directly with the first section.`;

// --- Context Formatting Helpers ---

function formatTranscripts(transcripts?: string[]): string {
  if (!transcripts?.length) return "";

  const parts: string[] = [
    "# Brand-Story / Kickoff Meeting Transcripts",
    "These are the user-selected discovery / brand-story sessions. They are the primary source for the Brand Story (customer, villain, problems, empathy/authority) and for the brand's authentic voice. Pull real phrases, pain points, and direct quotes from them.\n",
  ];

  transcripts.forEach((transcript, i) => {
    parts.push(`## Transcript ${i + 1}`);
    parts.push(transcript);
    parts.push("\n---\n");
  });

  return parts.join("\n");
}

function formatResearch(research?: MessagingPlanInput["research"]): string {
  if (!research?.full_document_markdown && !research?.competitive_scores) return "";

  const parts: string[] = ["# Research Deliverable (primary grounding for Market Opportunity & Positioning)"];

  if (research.full_document_markdown) {
    parts.push(research.full_document_markdown);
  }

  if (research.competitive_scores && Object.keys(research.competitive_scores).length) {
    parts.push("\n## Competitive Scores");
    parts.push("```json");
    parts.push(JSON.stringify(research.competitive_scores, null, 2));
    parts.push("```");
  }

  return parts.join("\n");
}

function formatRoadmap(roadmap?: Record<string, unknown>): string {
  if (!roadmap || !Object.keys(roadmap).length) return "";

  return [
    "# Roadmap Context (background only — what the engagement is executing)",
    "```json",
    JSON.stringify(roadmap, null, 2),
    "```",
  ].join("\n");
}

// --- Section Template ---

const SECTION_INSTRUCTIONS = `Produce the complete Messaging Plan in markdown with these sections, in this exact order. The spine is the StoryBrand 7-part brand story.

## 1. The Market Opportunity
Where the client sits in the competitive landscape and the gap they own. Ground this in the research — name the real competitors and describe the uncontested space the client can credibly claim. 2-4 substantive paragraphs.

## 2. The Positioning Claim
The single-sentence market position, stated boldly in quotes. Follow it with exactly 3 numbered points describing what that position accomplishes (each a **bold effect** — why). Close with a line noting that every piece of messaging — website, LinkedIn, outbound, proposals, paid, social — should connect back to this claim.

## 3. Positioning Statement (Internal Use)
A one-line internal positioning statement in this exact form:
\`[Client] is a [category] for [audience]. Unlike [alternative], [Client] [differentiator] — [payoff].\`

## 4. Brand Story
The full StoryBrand arc, with a labeled sub-section (###) for each beat:
- **Your Customer** — the main character / hero of the story.
- **Has a Challenge** — name the Villain (the antagonistic force), then break the challenge into external, internal, and philosophical problems.
- **Finds / Meets the Guide** — establish the brand as the guide through **Empathy** (a statement showing the brand understands the struggle, in the brand's voice) and **Authority** (proof it can solve the problem — results, scale, credentials; use real numbers where available).
- **Gets a Plan** — 3 clear steps the customer follows; optionally a commitment or guarantee.
- **Takes Action** — the primary (direct) CTA plus transitional CTAs.
- **Experiences Success** — a bulleted "after" state: what life looks like once they win.
- **Avoids Failure** — a bulleted list of the costs of inaction.
- **Transformation** — a From → To statement, plus an optional aspirational identity.

## 5. Brand Narrative
The full story arc, told in prose and used consistently across every channel. Write a short paragraph for each beat below, each led by its **bold label**:
- **The situation** — where the customer is when the story begins.
- **The stakes** — what's on the line if nothing changes.
- **The failed alternatives** — why the obvious other options (competitors, status quo, DIY) don't work.
- **The guide** — how the brand enters and why it's credible.
- **The plan** — the path forward, in a sentence or two.
- **The outcome** — where the customer ends up.

## 6. One-Liners
Several short, repeatable hooks built from the customer's problems. Use the format: a pointed question naming the pain → how the brand solves it (e.g. \`[Pain-point question?] [Client] [solves it by…]\`). Then an optional **Taglines** list of short, brand-voice one-liners for paid/OOH/social.

## 7. Messaging Pillars
3-5 pillars. For each pillar (### per pillar): a **Claim**, an **Explanation**, **Proof Points** (grounded in research/transcripts), and **Language to use / avoid**.

## 8. ICP-Specific Messaging
One block (### per ICP) for each ICP / segment, tiered by priority where useful. For each: **What they feel**, **Core message** (the single message that lands, in quotes), **The fear to address**, **The aspiration to connect to**, and **Primary offer language**.

## 9. Products & Solutions Matrix
A markdown table (one row per offering):

| Product / Solution | Helps Overcome These Challenges | Provides This Picture of Success | Helps Avoid This Failure |
|---|---|---|---|

## 10. Language: Use vs. Avoid
A master vocabulary list — words/phrases to use, and words/phrases to avoid — as a two-column table or two labeled lists.`;

// --- Prompt Builder ---

export function buildMessagingPlanPrompt(input: MessagingPlanInput): {
  system: string;
  user: string;
} {
  const companyName =
    input.client?.company_name || "[Client — derive from research]";
  const domain = input.client?.domain;

  const contextHeader = [
    `# Client: ${companyName}`,
    domain ? `Domain: ${domain}` : null,
    input.instructions
      ? `\n## Strategist Instructions (honor these above all)\n${input.instructions}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const researchBlock = formatResearch(input.research);
  const transcriptsBlock = formatTranscripts(input.transcripts);
  const roadmapBlock = formatRoadmap(input.roadmap);

  const contextBlocks = [researchBlock, transcriptsBlock, roadmapBlock]
    .filter(Boolean)
    .join("\n\n");

  const noContextNote =
    contextBlocks.length === 0
      ? "\n_No research, transcripts, or roadmap were provided. Build the strongest possible plan from the client identity and your expert brand-strategy knowledge, flagging genuinely unknowable specifics with `[PLACEHOLDER — owner to provide: …]`._\n"
      : "";

  const user = `${contextHeader}
${noContextNote}
${contextBlocks}

---

# Your Task

${SECTION_INSTRUCTIONS}

IMPORTANT REMINDERS:
- Fill in every section with client-specific content drawn from the provided context. Avoid generic boilerplate.
- Use real competitor names, real numbers, and direct quotes from the transcripts wherever they exist.
- Only use \`[PLACEHOLDER — owner to provide: …]\` when a fact is genuinely unavailable.
- This is the final deliverable a strategist hands to a client — prose quality and specificity matter.

Write the complete Messaging Plan now.`;

  return { system: MESSAGING_PLAN_SYSTEM_PROMPT, user };
}

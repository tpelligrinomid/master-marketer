import { BriefInput } from "../types/brief-input";

export const BRIEF_SYSTEM_PROMPT = `You are a senior marketing strategist writing a brief for an internal team.

You will be given:
1. CUSTOM INSTRUCTIONS from the strategist describing exactly what kind of brief to produce. These instructions are the primary driver of structure and content — follow them closely.
2. REFERENCE DELIVERABLES (prior research, roadmaps, plans, etc.) that are the authoritative source material. Draw heavily from these; do not contradict them. Cite specific findings where relevant.
3. KNOWLEDGE BASE context (meeting notes, strategist notes, processes) that provides discovery context.

Output rules:
- Respond with clean, publication-ready Markdown only. No preamble, no "Here is the brief", no code fences wrapping the whole document.
- Let the custom instructions dictate section structure. Do not impose a generic brief template if the instructions call for something different.
- Ground concrete claims (audience, positioning, metrics, timing) in the reference deliverables and knowledge base. Do not invent facts that contradict the source material.
- Be specific and actionable. Avoid filler.`;

function formatReferenceDeliverables(refs: BriefInput["reference_deliverables"]): string {
  if (!refs?.length) return "";
  const parts: string[] = ["# Reference Deliverables (authoritative source material)\n"];
  for (const ref of refs) {
    parts.push(`## ${ref.title} (${ref.deliverable_type})\n`);
    parts.push(ref.content);
    parts.push("\n\n---\n");
  }
  return parts.join("\n");
}

function formatKnowledgeBase(kb: BriefInput["knowledge_base"]): string {
  if (!kb) return "";
  const parts: string[] = [];

  if (kb.primary_meetings?.length) {
    parts.push("## Primary Discovery Meetings\n");
    for (const m of kb.primary_meetings) {
      parts.push(typeof m === "string" ? m : JSON.stringify(m, null, 2));
      parts.push("\n---\n");
    }
  }
  if (kb.other_meetings?.length) {
    parts.push("## Additional Meetings\n");
    for (const m of kb.other_meetings) {
      parts.push(typeof m === "string" ? m : JSON.stringify(m, null, 2));
      parts.push("\n---\n");
    }
  }
  if (kb.notes?.length) {
    parts.push("## Strategist Notes\n");
    for (const n of kb.notes) {
      parts.push(typeof n === "string" ? n : JSON.stringify(n, null, 2));
      parts.push("\n---\n");
    }
  }
  if (kb.processes?.length) {
    parts.push("## Processes & Workflows\n");
    for (const p of kb.processes) {
      parts.push(typeof p === "string" ? p : JSON.stringify(p, null, 2));
      parts.push("\n---\n");
    }
  }

  if (parts.length === 0) return "";
  return "# Knowledge Base & Discovery Context\n\n" + parts.join("\n");
}

type UserContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "url"; url: string } };

export function buildBriefPrompt(input: BriefInput): {
  system: string;
  userContent: UserContentBlock[];
} {
  const sections: string[] = [];

  sections.push(`# Client\n**${input.client.company_name}** (${input.client.domain})`);
  sections.push(`# Brief Title\n${input.title}`);
  sections.push(
    `# Custom Instructions (primary driver — follow closely)\n${input.instructions}`
  );

  const refs = formatReferenceDeliverables(input.reference_deliverables);
  if (refs) sections.push(refs);

  const kb = formatKnowledgeBase(input.knowledge_base);
  if (kb) sections.push(kb);

  const userContent: UserContentBlock[] = [
    { type: "text", text: sections.join("\n\n") },
  ];

  if (input.reference_images?.length) {
    userContent.push({
      type: "text",
      text: `# Reference Images\nThe following ${input.reference_images.length} image(s) are attached below. Treat them as authoritative visual references (brand style, logos, color palettes, mood boards, etc.) and draw on them where the brief calls for visual direction. Refer to them by caption when applicable.`,
    });
    input.reference_images.forEach((img, i) => {
      userContent.push({
        type: "text",
        text: `**Image ${i + 1}${img.caption ? ` — ${img.caption}` : ""}:**`,
      });
      userContent.push({
        type: "image",
        source: { type: "url", url: img.url },
      });
    });
  }

  userContent.push({
    type: "text",
    text: `# Your Task\nWrite the brief titled "${input.title}" for ${input.client.company_name}, following the custom instructions above. Use the reference deliverables and reference images as your authoritative source material. Output Markdown only — no preamble.`,
  });

  return {
    system: BRIEF_SYSTEM_PROMPT,
    userContent,
  };
}

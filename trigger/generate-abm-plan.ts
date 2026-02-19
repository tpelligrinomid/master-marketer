import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { AbmPlanInput, AbmPlanInputSchema } from "../src/types/abm-plan-input";
import type {
  GeneratedAbmPlanOutput,
  AbmPlanSection,
} from "../src/types/abm-plan-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import {
  ABM_TIER_METHODOLOGY,
  OUTBOUND_INTRO,
  PAID_MEDIA_INTRO,
  EVENT_MANAGEMENT_INTRO,
  MEASUREMENT_INTRO,
  LAUNCH_METHODOLOGY_INTRO,
} from "../src/prompts/abm-plan-boilerplate";
import {
  buildStrategyPrompt,
  buildChannelStrategyPrompt,
  buildInfrastructurePrompt,
  buildExecutionPrompt,
  getEnabledChannelNames,
} from "../src/prompts/abm-plan";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 32000;

async function callClaude(
  client: Anthropic,
  system: string,
  user: string
): Promise<string> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });

  const response = await stream.finalMessage();

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text;
}

// --- Markdown Assembly Helpers ---

function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function buildTableOfContents(sections: AbmPlanSection[]): string {
  const lines = ["## Table of Contents", ""];
  for (const section of sections) {
    lines.push(
      `${section.section_number}. [${section.section_title}](#${section.section_title.toLowerCase().replace(/[^a-z0-9]+/g, "-")})`
    );
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Split a Claude markdown response on <!-- SECTION: name --> markers.
 * Returns a map of section_name → markdown content.
 */
function splitOnSectionMarkers(response: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const markerPattern = /<!--\s*SECTION:\s*(\w+)\s*-->/g;

  const markers: { name: string; index: number }[] = [];
  let match;
  while ((match = markerPattern.exec(response)) !== null) {
    markers.push({ name: match[1], index: match.index + match[0].length });
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length
      ? response.lastIndexOf("<!--", markers[i + 1].index)
      : response.length;
    sections[markers[i].name] = response.slice(start, end).trim();
  }

  return sections;
}

/**
 * Get a section from the parsed map, or return a fallback message.
 */
function getSection(
  parsed: Record<string, string>,
  name: string,
  fallbackLabel?: string
): string {
  return parsed[name] || `*${fallbackLabel || name} section not generated.*`;
}

/**
 * Assemble the full document markdown by interleaving Claude-generated
 * sections with boilerplate blocks.
 *
 * Conditional flags (hasOutbound, hasPaidMedia) are pre-computed by the
 * task and passed in so they match the sectionDefs logic.
 */
function assembleFullDocument(
  title: string,
  engagementMeta: { client: string; date: string },
  call1Sections: Record<string, string>,
  call2Sections: Record<string, string>,
  call3Sections: Record<string, string>,
  call4Sections: Record<string, string>,
  conditionals: { hasOutbound: boolean; hasPaidMedia: boolean },
  sections: AbmPlanSection[]
): string {
  const parts: string[] = [];

  // Title + metadata
  parts.push(`# ${title}`);
  parts.push("");
  parts.push(
    `*Generated on ${engagementMeta.date} | ${sections.length} sections | ${sections.reduce((sum, s) => sum + s.word_count, 0).toLocaleString()} words*`
  );
  parts.push("");
  parts.push(`**Client:** ${engagementMeta.client}`);
  parts.push("");

  // TOC
  parts.push(buildTableOfContents(sections));
  parts.push("---");
  parts.push("");

  // Track which section number we're on (from the sections array)
  let sectionIdx = 0;

  // ── Section: Executive Summary (always) ──
  parts.push(`## ${sections[sectionIdx].section_title}`);
  parts.push("");
  parts.push(getSection(call1Sections, "executive_summary", "Executive Summary"));
  parts.push("");
  parts.push("---");
  parts.push("");
  sectionIdx++;

  // ── Section: Target Account Strategy (always) ──
  parts.push(`## ${sections[sectionIdx].section_title}`);
  parts.push("");
  parts.push(getSection(call1Sections, "target_account_strategy", "Target Account Strategy"));
  parts.push("");
  parts.push(ABM_TIER_METHODOLOGY);
  parts.push("");
  parts.push("---");
  parts.push("");
  sectionIdx++;

  // ── Section: Offer Strategy (always) ──
  parts.push(`## ${sections[sectionIdx].section_title}`);
  parts.push("");
  parts.push(getSection(call1Sections, "offer_strategy", "Offer Strategy & Conversion Architecture"));
  parts.push("");
  parts.push("---");
  parts.push("");
  sectionIdx++;

  // ── Section: Outbound Channels (conditional) ──
  if (conditionals.hasOutbound) {
    parts.push(`## ${sections[sectionIdx].section_title}`);
    parts.push("");
    parts.push(OUTBOUND_INTRO);
    parts.push("");
    parts.push(getSection(call2Sections, "outbound_channels", "Outbound Channel Strategy"));
    parts.push("");
    parts.push("---");
    parts.push("");
    sectionIdx++;
  }

  // ── Section: Paid Media (conditional) ──
  if (conditionals.hasPaidMedia) {
    parts.push(`## ${sections[sectionIdx].section_title}`);
    parts.push("");
    parts.push(PAID_MEDIA_INTRO);
    parts.push("");
    parts.push(getSection(call2Sections, "paid_media", "Paid Media & Advertising Strategy"));
    parts.push("");
    parts.push("---");
    parts.push("");
    sectionIdx++;
  }

  // ── Section: Event Management System (always) ──
  parts.push(`## ${sections[sectionIdx].section_title}`);
  parts.push("");
  parts.push(EVENT_MANAGEMENT_INTRO);
  parts.push("");
  parts.push(getSection(call3Sections, "event_management", "Event Management System"));
  parts.push("");
  parts.push("---");
  parts.push("");
  sectionIdx++;

  // ── Section: Tech Stack Architecture & Data Flow (always) ──
  parts.push(`## ${sections[sectionIdx].section_title}`);
  parts.push("");
  parts.push(getSection(call3Sections, "tech_stack_architecture", "Tech Stack Architecture & Data Flow"));
  parts.push("");
  parts.push("---");
  parts.push("");
  sectionIdx++;

  // ── Section: Measurement Framework (always) ──
  parts.push(`## ${sections[sectionIdx].section_title}`);
  parts.push("");
  parts.push(MEASUREMENT_INTRO);
  parts.push("");
  parts.push(getSection(call4Sections, "measurement_framework", "Measurement Framework & KPIs"));
  parts.push("");
  parts.push("---");
  parts.push("");
  sectionIdx++;

  // ── Section: Launch Plan (always) ──
  parts.push(`## ${sections[sectionIdx].section_title}`);
  parts.push("");
  parts.push(LAUNCH_METHODOLOGY_INTRO);
  parts.push("");
  parts.push(getSection(call4Sections, "launch_plan", "Launch Plan & 30/60/90-Day Timeline"));
  parts.push("");

  return parts.join("\n");
}

export const generateAbmPlan = task({
  id: "generate-abm-plan",
  maxDuration: 2400, // 40 minutes — 4 Claude calls
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: AbmPlanInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<GeneratedAbmPlanOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    // Validate input
    const input = AbmPlanInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    const channels = input.channels;
    const techStack = input.tech_stack;

    // Determine which conditional sections are active
    const hasOutbound = !!channels.email || !!channels.direct_mail;
    const hasPaidMedia = !!channels.linkedin_ads || !!channels.display_ads;

    // Accumulated markdown from prior calls — carries forward for coherence
    const accumulated: string[] = [];

    // ═══════════════════════════════════════════════
    // Call 1: Strategy (Executive Summary + Target Account Strategy + Offer Strategy)
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_1_strategy");
    metadata.set("progress", "Generating executive summary, target account strategy, and offer strategy...");

    const call1Prompt = buildStrategyPrompt(input);
    const call1Response = await callClaude(client, call1Prompt.system, call1Prompt.user);
    const call1Sections = splitOnSectionMarkers(call1Response);

    accumulated.push(call1Response);

    // ═══════════════════════════════════════════════
    // Call 2: Channel Strategy (conditional sections)
    // ═══════════════════════════════════════════════
    let call2Sections: Record<string, string> = {};

    if (hasOutbound || hasPaidMedia) {
      metadata.set("phase", "call_2_channels");
      metadata.set("progress", "Generating channel strategies...");

      const call2Prompt = buildChannelStrategyPrompt(input, accumulated);
      const call2Response = await callClaude(client, call2Prompt.system, call2Prompt.user);
      call2Sections = splitOnSectionMarkers(call2Response);

      accumulated.push(call2Response);
    }

    // ═══════════════════════════════════════════════
    // Call 3: Infrastructure (Event Management System + Tech Stack & Data Flow)
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_3_infrastructure");
    metadata.set("progress", "Generating event management system and tech stack architecture...");

    const call3Prompt = buildInfrastructurePrompt(input, accumulated);
    const call3Response = await callClaude(client, call3Prompt.system, call3Prompt.user);
    const call3Sections = splitOnSectionMarkers(call3Response);

    accumulated.push(call3Response);

    // ═══════════════════════════════════════════════
    // Call 4: Execution (Measurement Framework + Launch Plan)
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_4_execution");
    metadata.set("progress", "Generating measurement framework and launch plan...");

    const call4Prompt = buildExecutionPrompt(input, accumulated);
    const call4Response = await callClaude(client, call4Prompt.system, call4Prompt.user);
    const call4Sections = splitOnSectionMarkers(call4Response);

    // ═══════════════════════════════════════════════
    // Assembly Phase
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final ABM plan document...");

    const roadmapData = input.roadmap as Record<string, unknown>;

    const title =
      input.title || `ABM Plan: ${input.client.company_name}`;

    // Build sectionDefs dynamically based on enabled channels
    const sectionDefs: { title: string; marker: string; markdownParts: string[] }[] = [
      // Always present: sections 1-3
      {
        title: "Executive Summary",
        marker: "executive_summary",
        markdownParts: [
          getSection(call1Sections, "executive_summary", "Executive Summary"),
        ],
      },
      {
        title: "Target Account Strategy",
        marker: "target_account_strategy",
        markdownParts: [
          getSection(call1Sections, "target_account_strategy", "Target Account Strategy"),
          ABM_TIER_METHODOLOGY,
        ],
      },
      {
        title: "Offer Strategy & Conversion Architecture",
        marker: "offer_strategy",
        markdownParts: [
          getSection(call1Sections, "offer_strategy", "Offer Strategy & Conversion Architecture"),
        ],
      },
    ];

    // Conditional: section 4 — Outbound
    if (hasOutbound) {
      sectionDefs.push({
        title: "Outbound Channel Strategy",
        marker: "outbound_channels",
        markdownParts: [
          OUTBOUND_INTRO,
          getSection(call2Sections, "outbound_channels", "Outbound Channel Strategy"),
        ],
      });
    }

    // Conditional: section 5 — Paid Media
    if (hasPaidMedia) {
      sectionDefs.push({
        title: "Paid Media & Advertising Strategy",
        marker: "paid_media",
        markdownParts: [
          PAID_MEDIA_INTRO,
          getSection(call2Sections, "paid_media", "Paid Media & Advertising Strategy"),
        ],
      });
    }

    // Always present: sections 6-9
    sectionDefs.push(
      {
        title: "Event Management System",
        marker: "event_management",
        markdownParts: [
          EVENT_MANAGEMENT_INTRO,
          getSection(call3Sections, "event_management", "Event Management System"),
        ],
      },
      {
        title: "Tech Stack Architecture & Data Flow",
        marker: "tech_stack_architecture",
        markdownParts: [
          getSection(call3Sections, "tech_stack_architecture", "Tech Stack Architecture & Data Flow"),
        ],
      },
      {
        title: "Measurement Framework & KPIs",
        marker: "measurement_framework",
        markdownParts: [
          MEASUREMENT_INTRO,
          getSection(call4Sections, "measurement_framework", "Measurement Framework & KPIs"),
        ],
      },
      {
        title: "Launch Plan & 30/60/90-Day Timeline",
        marker: "launch_plan",
        markdownParts: [
          LAUNCH_METHODOLOGY_INTRO,
          getSection(call4Sections, "launch_plan", "Launch Plan & 30/60/90-Day Timeline"),
        ],
      }
    );

    // Build sections array with contiguous numbering
    const sections: AbmPlanSection[] = sectionDefs.map((def, i) => {
      const markdown = def.markdownParts.join("\n\n");
      return {
        section_number: i + 1,
        section_title: def.title,
        markdown,
        word_count: countWords(markdown),
      };
    });

    // Assemble full document
    const engagementMeta = {
      client: input.client.company_name,
      date: new Date().toISOString().slice(0, 10),
    };

    const full_document_markdown = assembleFullDocument(
      title,
      engagementMeta,
      call1Sections,
      call2Sections,
      call3Sections,
      call4Sections,
      { hasOutbound, hasPaidMedia },
      sections
    );

    const totalWordCount = sections.reduce((sum, s) => sum + s.word_count, 0);
    const enabledChannels = getEnabledChannelNames(channels);
    const totalTargetAccounts = input.target_segments.reduce(
      (sum, s) => sum + s.estimated_account_count, 0
    );

    // Auto-generate summary
    const summary = `This ABM plan for ${input.client.company_name} defines a ${input.target_segments.length}-segment account-based marketing program targeting ${totalTargetAccounts.toLocaleString()} accounts across ${enabledChannels.length} channels (${enabledChannels.map((c) => c.replace(/_/g, " ")).join(", ")}). It includes tiered engagement strategies, offer-to-funnel mapping, event management system, tech stack architecture with data flow, and a phased launch plan.`;

    const output: GeneratedAbmPlanOutput = {
      type: "abm_plan",
      title,
      summary,
      sections,
      full_document_markdown,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        total_word_count: totalWordCount,
        roadmap_title: (roadmapData.title as string) || `Marketing Roadmap: ${input.client.company_name}`,
        channels_enabled: enabledChannels,
        total_target_accounts: totalTargetAccounts,
      },
    };

    // ═══════════════════════════════════════════════
    // Webhook Callback Delivery
    // ═══════════════════════════════════════════════
    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(
        _callback,
        _jobId || "unknown",
        "completed",
        output
      );
    }

    metadata.set("progress", "Complete");
    return output;
  },
});

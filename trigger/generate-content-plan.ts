import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { ContentPlanInput, ContentPlanInputSchema } from "../src/types/content-plan-input";
import type {
  GeneratedContentPlanOutput,
  ContentPlanSection,
} from "../src/types/content-plan-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import {
  OVERVIEW_INTRO,
  FOUNDATION_INTRO,
  FOUNDATION_CONTENT_ATTRIBUTES,
  FOUNDATION_CONTENT_BRIEF_INTRO,
  FOUNDATION_CONTENT_INTELLIGENCE,
  BRAND_POSITIONING_INTRO,
  CONTENT_PROGRAM_INTRO,
  WORKFLOW_INTRO,
  WORKFLOW_THREE_PHASE,
  WORKFLOW_PRODUCTION_PROCESS,
  AMPLIFICATION_INTRO,
  MANAGEMENT_INTRO,
  MANAGEMENT_MONTHLY_REVIEW,
  MANAGEMENT_QUARTERLY_AUDIT,
  MANAGEMENT_REFRESH_RETIREMENT,
  NEXT_STEPS_INTRO,
  NEXT_STEPS_ONBOARDING,
  SEO_APPENDIX_INTRO,
  SEO_CONTENT_STRUCTURE,
  SEO_SNIPPET_OPTIMIZATION,
  SEO_VIDEO_PODCAST,
  SEO_MEASUREMENT_TEMPLATES,
  SEO_ONGOING_MANAGEMENT,
} from "../src/prompts/content-plan-boilerplate";
import {
  buildFoundationAndMessagingPrompt,
  buildContentProgramPrompt,
  buildAmplificationAndManagementPrompt,
  buildSeoFoundationAndClustersPrompt,
  buildAeoAndAuthorityPrompt,
} from "../src/prompts/content-plan";

const MODEL = "claude-opus-4-20250514";
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

function buildTableOfContents(sections: ContentPlanSection[]): string {
  const lines = ["# Table of Contents", ""];
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
 */
function assembleFullDocument(
  title: string,
  engagementMeta: { client: string; industry: string; date: string },
  call1Sections: Record<string, string>,
  call2Sections: Record<string, string>,
  call3Sections: Record<string, string>,
  call4Sections: Record<string, string>,
  call5Sections: Record<string, string>,
  sections: ContentPlanSection[]
): string {
  const parts: string[] = [];

  // Title + metadata
  parts.push(`# ${title}`);
  parts.push("");
  parts.push(
    `*Generated on ${engagementMeta.date} | ${sections.length} sections | ${sections.reduce((sum, s) => sum + s.word_count, 0).toLocaleString()} words*`
  );
  parts.push("");
  parts.push(`**Client:** ${engagementMeta.client} | **Industry:** ${engagementMeta.industry}`);
  parts.push("");

  // TOC
  parts.push(buildTableOfContents(sections));
  parts.push("---");
  parts.push("");

  // ── Section 1: Overview ──
  parts.push("# Overview");
  parts.push("");
  parts.push(OVERVIEW_INTRO);
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Section 2: Content Foundation ──
  parts.push("# Content Foundation");
  parts.push("");
  parts.push(FOUNDATION_INTRO);
  parts.push("");
  parts.push(getSection(call1Sections, "content_mission", "Content Mission"));
  parts.push("");
  parts.push(getSection(call1Sections, "content_categories", "Content Categories"));
  parts.push("");
  parts.push(getSection(call1Sections, "asset_types", "Asset Types"));
  parts.push("");
  parts.push(FOUNDATION_CONTENT_ATTRIBUTES);
  parts.push("");
  parts.push(FOUNDATION_CONTENT_BRIEF_INTRO);
  parts.push("");
  parts.push(getSection(call1Sections, "content_brief_example", "Sample Content Brief"));
  parts.push("");
  parts.push(FOUNDATION_CONTENT_INTELLIGENCE);
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Section 3: Brand Positioning & Messaging ──
  parts.push("# Brand Positioning & Messaging");
  parts.push("");
  parts.push(BRAND_POSITIONING_INTRO);
  parts.push("");
  parts.push(getSection(call1Sections, "brand_canvas", "Brand Canvas"));
  parts.push("");
  parts.push(getSection(call1Sections, "messaging_guidelines", "Messaging Guidelines"));
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Section 4: Content Program ──
  parts.push("# Content Program");
  parts.push("");
  parts.push(CONTENT_PROGRAM_INTRO);
  parts.push("");
  parts.push(getSection(call2Sections, "flagship_program", "Flagship Program"));
  parts.push("");
  parts.push(getSection(call2Sections, "episode_structure", "Episode Structure"));
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Section 5: Content Workflow & Production (boilerplate only) ──
  parts.push("# Content Workflow & Production");
  parts.push("");
  parts.push(WORKFLOW_INTRO);
  parts.push("");
  parts.push(WORKFLOW_THREE_PHASE);
  parts.push("");
  parts.push(WORKFLOW_PRODUCTION_PROCESS);
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Section 6: Content Amplification ──
  parts.push("# Content Amplification");
  parts.push("");
  parts.push(AMPLIFICATION_INTRO);
  parts.push("");
  parts.push(getSection(call3Sections, "content_amplification", "Content Amplification"));
  parts.push("");
  parts.push(getSection(call3Sections, "abm_integration", "ABM Integration"));
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Section 7: Ongoing Management & Optimization ──
  parts.push("# Ongoing Management & Optimization");
  parts.push("");
  parts.push(MANAGEMENT_INTRO);
  parts.push("");
  parts.push(getSection(call3Sections, "kpi_targets", "KPI Targets"));
  parts.push("");
  parts.push(MANAGEMENT_MONTHLY_REVIEW);
  parts.push("");
  parts.push(MANAGEMENT_QUARTERLY_AUDIT);
  parts.push("");
  parts.push(MANAGEMENT_REFRESH_RETIREMENT);
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Section 8: Next Steps ──
  parts.push("# Next Steps & Action Items");
  parts.push("");
  parts.push(NEXT_STEPS_INTRO);
  parts.push("");
  parts.push(NEXT_STEPS_ONBOARDING);
  parts.push("");
  parts.push(getSection(call3Sections, "milestones", "30/60/90-Day Milestones"));
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── Appendix: SEO/AEO Strategy ──
  parts.push("# Appendix: SEO/AEO Strategy");
  parts.push("");
  parts.push(SEO_APPENDIX_INTRO);
  parts.push("");

  // Call 4 sections
  parts.push(getSection(call4Sections, "technical_seo", "Technical SEO Assessment"));
  parts.push("");
  parts.push(getSection(call4Sections, "site_architecture", "Site Architecture"));
  parts.push("");
  parts.push(getSection(call4Sections, "keyword_strategy", "Keyword Strategy"));
  parts.push("");
  parts.push(getSection(call4Sections, "topic_clusters", "Topic Clusters"));
  parts.push("");
  parts.push(getSection(call4Sections, "faq_paa", "FAQ & PAA Targets"));
  parts.push("");

  // Boilerplate between Call 4 and Call 5
  parts.push(SEO_CONTENT_STRUCTURE);
  parts.push("");
  parts.push(SEO_SNIPPET_OPTIMIZATION);
  parts.push("");
  parts.push(SEO_VIDEO_PODCAST);
  parts.push("");

  // Call 5 sections
  parts.push(getSection(call5Sections, "entity_optimization", "Entity Optimization"));
  parts.push("");
  parts.push(getSection(call5Sections, "schema_recommendations", "Schema Markup Recommendations"));
  parts.push("");
  parts.push(getSection(call5Sections, "aeo_content_strategy", "AEO Content Strategy"));
  parts.push("");
  parts.push(getSection(call5Sections, "link_building", "Link Building Strategy"));
  parts.push("");
  parts.push(getSection(call5Sections, "seo_aeo_kpis", "SEO/AEO KPIs"));
  parts.push("");

  // Local SEO (conditional — may be a "not applicable" statement)
  const localSeo = call5Sections["local_seo"];
  if (localSeo) {
    parts.push(localSeo);
    parts.push("");
  }

  // Closing boilerplate
  parts.push(SEO_MEASUREMENT_TEMPLATES);
  parts.push("");
  parts.push(SEO_ONGOING_MANAGEMENT);
  parts.push("");

  return parts.join("\n");
}

export const generateContentPlan = task({
  id: "generate-content-plan",
  maxDuration: 2400, // 40 minutes — 5 Claude calls
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: ContentPlanInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<GeneratedContentPlanOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    // Validate input
    const input = ContentPlanInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Accumulated markdown from prior calls — carries forward for coherence
    const accumulated: string[] = [];

    // ═══════════════════════════════════════════════
    // Call 1: Foundation + Brand Messaging
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_1_foundation_messaging");
    metadata.set("progress", "Generating content foundation and brand messaging...");

    const call1Prompt = buildFoundationAndMessagingPrompt(input);
    const call1Response = await callClaude(client, call1Prompt.system, call1Prompt.user);
    const call1Sections = splitOnSectionMarkers(call1Response);

    accumulated.push(call1Response);

    // ═══════════════════════════════════════════════
    // Call 2: Content Program Design
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_2_content_program");
    metadata.set("progress", "Designing flagship content program...");

    const call2Prompt = buildContentProgramPrompt(input, accumulated);
    const call2Response = await callClaude(client, call2Prompt.system, call2Prompt.user);
    const call2Sections = splitOnSectionMarkers(call2Response);

    accumulated.push(call2Response);

    // ═══════════════════════════════════════════════
    // Call 3: Amplification + Management + Next Steps
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_3_amplification_management");
    metadata.set("progress", "Generating amplification strategy, KPIs, and milestones...");

    const call3Prompt = buildAmplificationAndManagementPrompt(input, accumulated);
    const call3Response = await callClaude(client, call3Prompt.system, call3Prompt.user);
    const call3Sections = splitOnSectionMarkers(call3Response);

    accumulated.push(call3Response);

    // ═══════════════════════════════════════════════
    // Call 4: SEO/AEO Appendix Part 1 — Foundation + Topic Clusters
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_4_seo_foundation_clusters");
    metadata.set("progress", "Generating SEO foundation and topic clusters...");

    const call4Prompt = buildSeoFoundationAndClustersPrompt(input, accumulated);
    const call4Response = await callClaude(client, call4Prompt.system, call4Prompt.user);
    const call4Sections = splitOnSectionMarkers(call4Response);

    accumulated.push(call4Response);

    // ═══════════════════════════════════════════════
    // Call 5: SEO/AEO Appendix Part 2 — AEO + Authority + Measurement
    // ═══════════════════════════════════════════════
    metadata.set("phase", "call_5_aeo_authority_measurement");
    metadata.set("progress", "Generating AEO strategy, link building, and SEO KPIs...");

    const call5Prompt = buildAeoAndAuthorityPrompt(input, accumulated);
    const call5Response = await callClaude(client, call5Prompt.system, call5Prompt.user);
    const call5Sections = splitOnSectionMarkers(call5Response);

    // ═══════════════════════════════════════════════
    // Assembly Phase
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final content plan document...");

    const roadmapData = input.roadmap as Record<string, unknown>;
    const seoAuditData = input.seo_audit as Record<string, unknown>;

    const title =
      input.title || `Content Plan: ${input.client.company_name}`;

    // Build summary from Call 1 + Call 2 content
    const categorySection = call1Sections["content_categories"] || "";
    const categoryCount = (categorySection.match(/^###\s/gm) || []).length || 4;
    const programSection = call2Sections["flagship_program"] || "";
    const programNameMatch = programSection.match(/(?:\*\*Program Name:\*\*|"([^"]+)"|"([^"]+)")\s*(.+)/);
    const programName = programNameMatch
      ? (programNameMatch[1] || programNameMatch[2] || programNameMatch[3] || "").trim()
      : "flagship content program";

    const summary = `This content plan for ${input.client.company_name} defines a comprehensive content strategy anchored by a flagship content program built on ${categoryCount} content categories. It synthesizes the marketing roadmap and SEO audit into an actionable program with topic clusters, channel strategy, and 30/60/90-day milestones.`;

    // Build the sections array — one per top-level document section
    const sectionDefs: { title: string; markdownParts: string[] }[] = [
      {
        title: "Overview",
        markdownParts: [OVERVIEW_INTRO],
      },
      {
        title: "Content Foundation",
        markdownParts: [
          FOUNDATION_INTRO,
          getSection(call1Sections, "content_mission", "Content Mission"),
          getSection(call1Sections, "content_categories", "Content Categories"),
          getSection(call1Sections, "asset_types", "Asset Types"),
          FOUNDATION_CONTENT_ATTRIBUTES,
          FOUNDATION_CONTENT_BRIEF_INTRO,
          getSection(call1Sections, "content_brief_example", "Sample Content Brief"),
          FOUNDATION_CONTENT_INTELLIGENCE,
        ],
      },
      {
        title: "Brand Positioning & Messaging",
        markdownParts: [
          BRAND_POSITIONING_INTRO,
          getSection(call1Sections, "brand_canvas", "Brand Canvas"),
          getSection(call1Sections, "messaging_guidelines", "Messaging Guidelines"),
        ],
      },
      {
        title: "Content Program",
        markdownParts: [
          CONTENT_PROGRAM_INTRO,
          getSection(call2Sections, "flagship_program", "Flagship Program"),
          getSection(call2Sections, "episode_structure", "Episode Structure"),
        ],
      },
      {
        title: "Content Workflow & Production",
        markdownParts: [
          WORKFLOW_INTRO,
          WORKFLOW_THREE_PHASE,
          WORKFLOW_PRODUCTION_PROCESS,
        ],
      },
      {
        title: "Content Amplification",
        markdownParts: [
          AMPLIFICATION_INTRO,
          getSection(call3Sections, "content_amplification", "Content Amplification"),
          getSection(call3Sections, "abm_integration", "ABM Integration"),
        ],
      },
      {
        title: "Ongoing Management & Optimization",
        markdownParts: [
          MANAGEMENT_INTRO,
          getSection(call3Sections, "kpi_targets", "KPI Targets"),
          MANAGEMENT_MONTHLY_REVIEW,
          MANAGEMENT_QUARTERLY_AUDIT,
          MANAGEMENT_REFRESH_RETIREMENT,
        ],
      },
      {
        title: "Next Steps & Action Items",
        markdownParts: [
          NEXT_STEPS_INTRO,
          NEXT_STEPS_ONBOARDING,
          getSection(call3Sections, "milestones", "30/60/90-Day Milestones"),
        ],
      },
      {
        title: "Appendix: SEO/AEO Strategy",
        markdownParts: [
          SEO_APPENDIX_INTRO,
          getSection(call4Sections, "technical_seo", "Technical SEO Assessment"),
          getSection(call4Sections, "site_architecture", "Site Architecture"),
          getSection(call4Sections, "keyword_strategy", "Keyword Strategy"),
          getSection(call4Sections, "topic_clusters", "Topic Clusters"),
          getSection(call4Sections, "faq_paa", "FAQ & PAA Targets"),
          SEO_CONTENT_STRUCTURE,
          SEO_SNIPPET_OPTIMIZATION,
          SEO_VIDEO_PODCAST,
          getSection(call5Sections, "entity_optimization", "Entity Optimization"),
          getSection(call5Sections, "schema_recommendations", "Schema Markup Recommendations"),
          getSection(call5Sections, "aeo_content_strategy", "AEO Content Strategy"),
          getSection(call5Sections, "link_building", "Link Building Strategy"),
          getSection(call5Sections, "seo_aeo_kpis", "SEO/AEO KPIs"),
          ...(call5Sections["local_seo"] ? [call5Sections["local_seo"]] : []),
          SEO_MEASUREMENT_TEMPLATES,
          SEO_ONGOING_MANAGEMENT,
        ],
      },
    ];

    const sections: ContentPlanSection[] = sectionDefs.map((def, i) => {
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
      industry: extractIndustry(roadmapData),
      date: new Date().toISOString().slice(0, 10),
    };

    const full_document_markdown = assembleFullDocument(
      title,
      engagementMeta,
      call1Sections,
      call2Sections,
      call3Sections,
      call4Sections,
      call5Sections,
      sections
    );

    const totalWordCount = sections.reduce((sum, s) => sum + s.word_count, 0);

    const output: GeneratedContentPlanOutput = {
      type: "content_plan",
      title,
      summary,
      sections,
      full_document_markdown,
      metadata: {
        model: MODEL,
        version: extractPreviousVersion(input.previous_content_plan as Record<string, unknown> | undefined) + 1,
        generated_at: new Date().toISOString(),
        total_word_count: totalWordCount,
        roadmap_title: (roadmapData.title as string) || `Marketing Roadmap: ${input.client.company_name}`,
        seo_audit_title: (seoAuditData.title as string) || `SEO/AEO Audit: ${input.client.company_name}`,
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

// --- Helper Functions ---

/**
 * Extract industry from roadmap target_market data.
 */
function extractIndustry(roadmap: Record<string, unknown>): string {
  try {
    const targetMarket = roadmap.target_market as { profiles?: Array<{ target_account?: { industry?: string } }> } | undefined;
    if (targetMarket?.profiles?.[0]?.target_account?.industry) {
      return targetMarket.profiles[0].target_account.industry;
    }
  } catch {
    // Fall through
  }
  return "B2B";
}

/**
 * Extract the version number from a previous content plan output.
 * Returns 0 if no previous plan exists (so version starts at 1).
 */
function extractPreviousVersion(
  previousPlan: Record<string, unknown> | undefined
): number {
  if (!previousPlan) return 0;
  try {
    const metadata = previousPlan.metadata as { version?: number } | undefined;
    return metadata?.version ?? 0;
  } catch {
    return 0;
  }
}

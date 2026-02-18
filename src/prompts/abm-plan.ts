import { AbmPlanInput } from "../types/abm-plan-input";
import {
  ABM_TIER_METHODOLOGY,
  OUTBOUND_INTRO,
  PAID_MEDIA_INTRO,
  EVENTS_COMMUNITY_INTRO,
  SLA_FRAMEWORK,
  MEASUREMENT_INTRO,
  LAUNCH_METHODOLOGY_INTRO,
} from "./abm-plan-boilerplate";

// --- System Prompt ---

export const ABM_PLAN_SYSTEM_PROMPT = `You are a senior account-based marketing strategist at a top-tier B2B marketing consultancy building a client's ABM Plan — the comprehensive account-based marketing strategy document that turns a marketing roadmap, competitive research, and client input into an actionable ABM program.

Your approach synthesizes FOUR sources of insight:

1. **Marketing Roadmap (provided)** — ICPs with empathy maps, StoryBrand framework, products & solutions, competitive positioning, goals, and roadmap phases. This defines WHO you're targeting and WHAT the business is trying to achieve.

2. **Competitive Research (provided)** — Full competitive analysis with scores across organic SEO, social media, content strategy, paid media, and brand positioning. This defines the competitive landscape and where opportunities exist.

3. **Meeting Transcripts (provided)** — Discovery sessions, kickoff meetings, and alignment calls with the client. These reveal the client's priorities, constraints, preferences, and business context that data alone cannot capture.

4. **ABM Configuration (provided)** — Target segments with tier assignments, offers mapped to funnel stages, channel configurations with specific platforms and budgets, and tech stack details. This defines the tactical parameters of the program.

**When meetings and data conflict, meetings take priority.** The client's stated priorities and business reality override data-driven recommendations.

Output rules:
- Write in professional, narrative markdown suitable for a C-suite audience
- NEVER use # (h1) or ## (h2) — those heading levels are reserved for the document title and section headers added during assembly. Use ### for section sub-headers, #### for sub-sub-headers
- Use tables, bullet lists, bold text, and blockquotes as appropriate
- Every recommendation must be specific and client-relevant — no placeholder text like "TBD" or "[insert here]"
- All recommendations must be grounded in the roadmap data, research, meeting context, and ABM configuration provided
- Channel strategies must reference the specific platforms, budgets, and configurations provided
- Offer recommendations must reference the specific offers and funnel stages defined
- Separate distinct output sections with HTML comment markers: <!-- SECTION: section_name -->
- Do NOT wrap output in code blocks — write raw markdown`;

// --- Shared Helpers (duplicated from content-plan.ts per existing pattern) ---

function buildContextBlock(input: AbmPlanInput): string {
  const parts = [
    `# Client: ${input.client.company_name}`,
    `Domain: ${input.client.domain}`,
  ];

  if (input.instructions) {
    parts.push(`\n## Strategist Instructions\n${input.instructions}`);
  }

  return parts.join("\n");
}

function formatTranscripts(transcripts: string[], maxChars: number): string {
  if (!transcripts.length) return "";

  const parts = ["# Meeting Transcripts\n"];
  let totalChars = 0;

  for (let i = 0; i < transcripts.length; i++) {
    const remaining = maxChars - totalChars;
    if (remaining <= 0) break;

    parts.push(`## Transcript ${i + 1}\n`);
    const text = transcripts[i].slice(0, remaining);
    parts.push(text);
    parts.push("\n---\n");
    totalChars += text.length;
  }

  return parts.join("\n");
}

function summarizePriorSections(accumulated: string[]): string {
  if (accumulated.length === 0) return "";

  const parts = [
    "# Prior Sections (from earlier calls — maintain coherence)\n",
    "The following markdown sections have already been written. Maintain consistency with terminology, recommendations, and strategic direction established in these sections.\n",
  ];

  for (const section of accumulated) {
    const truncated =
      section.length > 3000
        ? section.slice(0, 3000) + "\n\n... (truncated)"
        : section;
    parts.push(truncated);
    parts.push("\n---\n");
  }

  return parts.join("\n");
}

function summarizeRoadmapForContext(
  roadmap: Record<string, unknown>,
  focusKeys: string[]
): string {
  const parts = ["# Roadmap Data\n"];

  for (const key of focusKeys) {
    const value = roadmap[key];
    if (value === undefined) continue;
    const json = JSON.stringify(value, null, 2);
    const truncated = json.length > 5000 ? json.slice(0, 5000) + "\n... (truncated)" : json;
    parts.push(`## ${key}\n\`\`\`json\n${truncated}\n\`\`\`\n`);
  }

  return parts.join("\n");
}

// --- ABM-Specific Helpers ---

/**
 * Resolve "other" variant for a field. If value is "other", return the _other field or "Other".
 */
function resolveOther(value: string, otherValue?: string): string {
  if (value === "other" && otherValue) return otherValue;
  // Pretty-print enum values: "factors_ai" → "Factors.ai", "hubspot" → "HubSpot"
  const prettyNames: Record<string, string> = {
    hubspot: "HubSpot",
    salesforce: "Salesforce",
    pipedrive: "Pipedrive",
    marketo: "Marketo",
    pardot: "Pardot",
    activecampaign: "ActiveCampaign",
    clay: "Clay",
    apollo: "Apollo",
    zoominfo: "ZoomInfo",
    lusha: "Lusha",
    clearbit: "Clearbit",
    factors_ai: "Factors.ai",
    bombora: "Bombora",
    "6sense": "6sense",
    demandbase: "Demandbase",
    g2: "G2",
    n8n: "n8n",
    zapier: "Zapier",
    make: "Make",
    tray_io: "Tray.io",
    smartlead: "Smartlead",
    outreach: "Outreach",
    salesloft: "SalesLoft",
    instantly: "Instantly",
    metadata_io: "Metadata.io",
    rollworks: "RollWorks",
    terminus: "Terminus",
    google_display: "Google Display Network",
    sendoso: "Sendoso",
    postal: "Postal",
    reachdesk: "Reachdesk",
    alyce: "Alyce",
    manual: "Manual",
    rb2b: "RB2B",
    clearbit_reveal: "Clearbit Reveal",
    leadfeeder: "Leadfeeder",
  };
  return prettyNames[value] || value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * List enabled channels with config details. Notes which are disabled.
 */
function formatChannelsForContext(channels: AbmPlanInput["channels"]): string {
  const parts = ["# Channels Configuration\n"];
  const allChannelKeys = ["email", "linkedin_ads", "display_ads", "direct_mail", "events", "website_intelligence"] as const;
  const enabled: string[] = [];
  const disabled: string[] = [];

  for (const key of allChannelKeys) {
    const ch = channels[key];
    if (!ch) {
      disabled.push(key.replace(/_/g, " "));
      continue;
    }
    enabled.push(key.replace(/_/g, " "));

    parts.push(`## ${key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`);

    switch (key) {
      case "email": {
        const e = channels.email!;
        parts.push(`- **Platform:** ${resolveOther(e.platform, e.platform_other)}`);
        parts.push(`- **Sending Domains:** ${e.sending_domains.join(", ")}`);
        parts.push(`- **Daily Send Volume:** ${e.daily_send_volume.toLocaleString()}`);
        parts.push(`- **Warmup Needed:** ${e.warmup_needed ? "Yes" : "No"}`);
        if (e.sequences_count) parts.push(`- **Sequences:** ${e.sequences_count}`);
        break;
      }
      case "linkedin_ads": {
        const l = channels.linkedin_ads!;
        parts.push(`- **Monthly Budget:** $${l.monthly_budget.toLocaleString()}`);
        parts.push(`- **Formats:** ${l.formats.map((f) => f.replace(/_/g, " ")).join(", ")}`);
        break;
      }
      case "display_ads": {
        const d = channels.display_ads!;
        parts.push(`- **Platform:** ${resolveOther(d.platform, d.platform_other)}`);
        parts.push(`- **Monthly Budget:** $${d.monthly_budget.toLocaleString()}`);
        parts.push(`- **Retargeting:** ${d.retargeting ? "Yes" : "No"}`);
        break;
      }
      case "direct_mail": {
        const dm = channels.direct_mail!;
        parts.push(`- **Provider:** ${resolveOther(dm.provider, dm.provider_other)}`);
        parts.push(`- **Budget Per Send:** $${dm.budget_per_send.toLocaleString()}`);
        break;
      }
      case "events": {
        const ev = channels.events!;
        parts.push(`- **Event Types:** ${ev.types.map((t) => t.replace(/_/g, " ")).join(", ")}`);
        parts.push(`- **Annual Event Count:** ${ev.annual_event_count}`);
        break;
      }
      case "website_intelligence": {
        const wi = channels.website_intelligence!;
        parts.push(`- **Platform:** ${resolveOther(wi.platform, wi.platform_other)}`);
        break;
      }
    }
    parts.push("");
  }

  if (disabled.length > 0) {
    parts.push(`**Disabled channels:** ${disabled.join(", ")}\n`);
  }

  return parts.join("\n");
}

/**
 * Format tech stack as a readable list, resolving "other" variants.
 */
function formatTechStackForContext(techStack: AbmPlanInput["tech_stack"]): string {
  const parts = ["# Tech Stack\n"];

  parts.push(`- **CRM:** ${resolveOther(techStack.crm, techStack.crm_other)}`);

  if (techStack.marketing_automation && techStack.marketing_automation !== "none") {
    parts.push(`- **Marketing Automation:** ${resolveOther(techStack.marketing_automation, techStack.marketing_automation_other)}`);
  }

  parts.push(`- **Data Enrichment:** ${resolveOther(techStack.data_enrichment, techStack.data_enrichment_other)}`);

  if (techStack.intent_data && techStack.intent_data !== "none") {
    parts.push(`- **Intent Data:** ${resolveOther(techStack.intent_data, techStack.intent_data_other)}`);
  }

  if (techStack.workflow_automation && techStack.workflow_automation !== "none") {
    parts.push(`- **Workflow Automation:** ${resolveOther(techStack.workflow_automation, techStack.workflow_automation_other)}`);
  }

  return parts.join("\n");
}

const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1 (1:1)",
  tier_2: "Tier 2 (1:Few)",
  tier_3: "Tier 3 (1:Many)",
};

/**
 * Format target segments as a markdown table with tier labels.
 */
function formatTargetSegments(segments: AbmPlanInput["target_segments"]): string {
  const parts = [
    "# Target Segments\n",
    "| Segment | Description | Est. Accounts | Tier |",
    "|---|---|---|---|",
  ];

  for (const seg of segments) {
    parts.push(
      `| ${seg.segment_name} | ${seg.description} | ${seg.estimated_account_count.toLocaleString()} | ${TIER_LABELS[seg.tier] || seg.tier} |`
    );
  }

  return parts.join("\n");
}

/**
 * Format offers as a markdown table grouped by funnel stage.
 */
function formatOffers(offers: AbmPlanInput["offers"]): string {
  const parts = [
    "# Offers\n",
    "| Offer | Type | Funnel Stage | Description |",
    "|---|---|---|---|",
  ];

  const stageOrder = ["top", "middle", "bottom"];
  const sorted = [...offers].sort(
    (a, b) => stageOrder.indexOf(a.funnel_stage) - stageOrder.indexOf(b.funnel_stage)
  );

  const stageLabels: Record<string, string> = {
    top: "Top of Funnel",
    middle: "Middle of Funnel",
    bottom: "Bottom of Funnel",
  };

  for (const offer of sorted) {
    parts.push(
      `| ${offer.offer_name} | ${offer.offer_type.replace(/_/g, " ")} | ${stageLabels[offer.funnel_stage] || offer.funnel_stage} | ${offer.description || "—"} |`
    );
  }

  return parts.join("\n");
}

/**
 * Format program settings (budget, SLA, timeline) — only includes defined fields.
 */
function formatProgramSettings(input: AbmPlanInput): string {
  const parts = ["# Program Settings\n"];
  let hasAny = false;

  if (input.monthly_ad_budget !== undefined) {
    parts.push(`- **Monthly Ad Budget:** $${input.monthly_ad_budget.toLocaleString()}`);
    hasAny = true;
  }

  if (input.sales_follow_up_sla_hours !== undefined) {
    parts.push(`- **Sales Follow-Up SLA:** ${input.sales_follow_up_sla_hours} hours`);
    hasAny = true;
  }

  if (input.launch_timeline !== undefined) {
    const timelineLabels: Record<string, string> = {
      "30_days": "30 days",
      "60_days": "60 days",
      "90_days": "90 days",
    };
    parts.push(`- **Launch Timeline:** ${timelineLabels[input.launch_timeline] || input.launch_timeline}`);
    hasAny = true;
  }

  if (!hasAny) return "";
  return parts.join("\n");
}

/**
 * Format research as truncated markdown + competitive scores JSON.
 */
function formatResearchForContext(research: AbmPlanInput["research"]): string {
  const parts = ["# Competitive Research\n"];

  const md = research.full_document_markdown;
  const truncated = md.length > 8000 ? md.slice(0, 8000) + "\n... (truncated)" : md;
  parts.push(truncated);

  if (Object.keys(research.competitive_scores).length > 0) {
    parts.push(`\n## Competitive Scores\n\`\`\`json\n${JSON.stringify(research.competitive_scores, null, 2)}\n\`\`\`\n`);
  }

  return parts.join("\n");
}

/**
 * Get list of enabled channel names. Also used by the trigger task for metadata.
 */
export function getEnabledChannelNames(channels: AbmPlanInput["channels"]): string[] {
  const names: string[] = [];
  if (channels.email) names.push("email");
  if (channels.linkedin_ads) names.push("linkedin_ads");
  if (channels.display_ads) names.push("display_ads");
  if (channels.direct_mail) names.push("direct_mail");
  if (channels.events) names.push("events");
  if (channels.website_intelligence) names.push("website_intelligence");
  return names;
}

// --- Prompt Builders ---

/**
 * Call 1: Strategy — Executive Summary + Target Account Strategy + Offer Strategy
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: executive_summary -->
 * - <!-- SECTION: target_account_strategy -->
 * - <!-- SECTION: offer_strategy -->
 */
export function buildStrategyPrompt(
  input: AbmPlanInput
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const transcripts = formatTranscripts(input.transcripts, 15000);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["target_market", "brand_story", "products_and_solutions", "goals"]
  );
  const research = formatResearchForContext(input.research);
  const segments = formatTargetSegments(input.target_segments);
  const offers = formatOffers(input.offers);
  const channelsSummary = formatChannelsForContext(input.channels);
  const programSettings = formatProgramSettings(input);

  const user = `${context}

${transcripts}

${roadmapContext}

${research}

${segments}

${offers}

${channelsSummary}

${programSettings}

---

# Task: Write Strategy Sections (Executive Summary + Target Account Strategy + Offer Strategy)

Write three markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables, bullet lists, and bold text as appropriate.

<!-- SECTION: executive_summary -->
### Executive Summary

Write a 3-5 paragraph executive summary that:
- Opens with the client's strategic opportunity in account-based marketing, grounded in their market position and competitive landscape
- Summarizes the ABM program scope: number of target segments, total addressable accounts, enabled channels, and key offers
- Outlines the expected impact — connect to the roadmap's goals and the client's business objectives
- Closes with the phased approach and what success looks like at 30/60/90 days

The summary should be compelling enough to stand alone as a board-level briefing document. Reference specific data from the roadmap, research, and ABM configuration — no generic statements.

<!-- SECTION: target_account_strategy -->
### Target Account Strategy

For each target segment defined in the configuration, write a detailed subsection (#### [Segment Name]) containing:

1. **Segment Profile:** 2-3 sentences describing the segment, ideal account characteristics, and why these accounts are strategically valuable
2. **Tier Assignment Rationale:** Why this segment is assigned to ${input.target_segments.map((s) => TIER_LABELS[s.tier]).join(" / ")} — connect to deal size potential, strategic value, and engagement capacity
3. **Account Selection Criteria:** 5-7 specific, measurable criteria for identifying and qualifying accounts for this segment (firmographic, technographic, behavioral)
4. **Engagement Model:** How this tier will be engaged — what level of personalization, which channels, what cadence
5. **ICP Alignment:** Connect this segment to the roadmap's ICP profiles — which buying committee members matter most and why

Present a summary comparison table after all segment subsections:

| Segment | Tier | Est. Accounts | Primary Channels | Engagement Level |
|---|---|---|---|---|

Ground all recommendations in the roadmap's target market data, competitive research, and the client's actual business context from transcripts.

<!-- SECTION: offer_strategy -->
### Offer Strategy & Conversion Architecture

Write a comprehensive offer strategy that:

1. **Offer-to-Funnel Mapping:** Present a table mapping each configured offer to its funnel stage, target segments, and primary distribution channel:

| Offer | Type | Funnel Stage | Target Segments | Primary Channel |
|---|---|---|---|---|

2. **Conversion Architecture:** Design the conversion path from first touch to closed deal. For each funnel stage (top → middle → bottom), describe:
   - The primary offers that serve this stage
   - The trigger that moves an account to the next stage
   - The handoff mechanism between marketing and sales

3. **Offer Development Priorities:** Rank the offers by launch priority (Phase 1, 2, or 3) based on which ones are most critical for initial program launch vs. which can be developed later

4. **Personalization by Tier:** Describe how offers are customized across tiers — Tier 1 accounts get bespoke versions, Tier 2 gets segment-customized versions, Tier 3 gets standard versions

Connect every recommendation to the specific offers, segments, and channels provided in the configuration.`;

  return { system: ABM_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 2: Channel Strategy — Outbound + Paid Media + Events/Community (conditional)
 *
 * Produces markdown with SECTION markers (only for enabled channel groups):
 * - <!-- SECTION: outbound_channels --> (if email or direct_mail)
 * - <!-- SECTION: paid_media --> (if linkedin_ads or display_ads)
 * - <!-- SECTION: events_community --> (if events, website_intelligence, or intent_data)
 */
export function buildChannelStrategyPrompt(
  input: AbmPlanInput,
  accumulated: string[]
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorSections = summarizePriorSections(accumulated);
  const segments = formatTargetSegments(input.target_segments);
  const offers = formatOffers(input.offers);
  const channelsDetail = formatChannelsForContext(input.channels);
  const techStack = formatTechStackForContext(input.tech_stack);

  const channels = input.channels;
  const hasEmail = !!channels.email;
  const hasDirectMail = !!channels.direct_mail;
  const hasLinkedinAds = !!channels.linkedin_ads;
  const hasDisplayAds = !!channels.display_ads;
  const hasEvents = !!channels.events;
  const hasWebIntel = !!channels.website_intelligence;
  const hasIntentData = !!(input.tech_stack.intent_data && input.tech_stack.intent_data !== "none");

  // Build the task section dynamically based on enabled channels
  const taskParts: string[] = [];

  taskParts.push(`# Task: Write Channel Strategy Sections

Write the following markdown sections based on the enabled channels. Each section is preceded by an HTML comment marker. Write in professional narrative prose with tables, bullet lists, and bold text.
`);

  // --- Outbound Section ---
  if (hasEmail || hasDirectMail) {
    taskParts.push(`<!-- SECTION: outbound_channels -->
### Outbound Channel Strategy

Design a comprehensive outbound strategy for the enabled outbound channels. Write as professional narrative with detailed, actionable recommendations.
`);

    if (hasEmail) {
      const e = channels.email!;
      taskParts.push(`#### Email Outreach

Design the email outbound program using **${resolveOther(e.platform, e.platform_other)}** with the following parameters:
- Sending domains: ${e.sending_domains.join(", ")}
- Daily send volume: ${e.daily_send_volume.toLocaleString()}
- Warmup needed: ${e.warmup_needed ? "Yes — include a domain warmup plan" : "No — domains are warm"}
${e.sequences_count ? `- Target sequences: ${e.sequences_count}` : ""}

Write:
1. **Sequence Architecture:** Design ${e.sequences_count || "3-5"} email sequences tailored to different segments and funnel stages. For each sequence, provide: sequence name, target segment + tier, trigger/entry criteria, number of touches, cadence, and a brief description of the messaging arc.

Present as a table:
| Sequence | Target Segment | Tier | Trigger | Touches | Cadence | Messaging Arc |
|---|---|---|---|---|---|---|

2. **Personalization Framework:** How email copy varies by tier — Tier 1 gets fully custom, Tier 2 gets segment-customized, Tier 3 gets template-based with dynamic fields. Include specific personalization tokens and data sources.

3. **Domain & Deliverability Strategy:** ${e.warmup_needed ? "Include a warmup schedule for the sending domains, target volume ramp, and deliverability monitoring plan." : "Describe the deliverability maintenance plan for the warm domains."} Reference the specific sending domains.

4. **Integration Points:** How email outreach connects to the CRM, enrichment tools, and other channels for multi-threaded account engagement.
`);
    }

    if (hasDirectMail) {
      const dm = channels.direct_mail!;
      taskParts.push(`#### Direct Mail

Design the direct mail program using **${resolveOther(dm.provider, dm.provider_other)}** with a budget of **$${dm.budget_per_send.toLocaleString()} per send**.

Write:
1. **Direct Mail Plays:** Design 3-5 direct mail plays for different tiers and triggers. For each play, provide: play name, target tier, trigger event, package description, estimated cost, and expected response rate.

Present as a table:
| Play | Target Tier | Trigger | Package | Est. Cost | Expected Response |
|---|---|---|---|---|---|

2. **Tier-Based Investment:** How direct mail investment scales across tiers — Tier 1 gets premium, personalized packages; Tier 2 gets segment-themed packages; Tier 3 gets event-triggered standard packages.

3. **Orchestration:** How direct mail is sequenced with email and other digital touches for maximum impact. Include timing relative to other channel touchpoints.
`);
    }
  }

  // --- Paid Media Section ---
  if (hasLinkedinAds || hasDisplayAds) {
    taskParts.push(`<!-- SECTION: paid_media -->
### Paid Media & Advertising Strategy

Design a comprehensive ABM paid media strategy for the enabled advertising channels.
`);

    if (hasLinkedinAds) {
      const l = channels.linkedin_ads!;
      taskParts.push(`#### LinkedIn Advertising

Design the LinkedIn ABM advertising program with a **$${l.monthly_budget.toLocaleString()}/month** budget using these formats: **${l.formats.map((f) => f.replace(/_/g, " ")).join(", ")}**.

Write:
1. **Campaign Architecture:** Design 3-5 LinkedIn campaigns mapped to segments and funnel stages. For each campaign, provide: campaign name, objective, target segment, ad format, estimated monthly spend, and key messaging theme.

Present as a table:
| Campaign | Objective | Target Segment | Format | Monthly Spend | Messaging |
|---|---|---|---|---|---|

2. **Audience Strategy:** How LinkedIn audiences are built for each tier — Tier 1 uses matched audiences (company lists + job title targeting), Tier 2 uses industry + firmographic combinations, Tier 3 uses broader lookalike and interest-based targeting. Reference LinkedIn's specific targeting capabilities.

3. **Budget Allocation:** How the $${l.monthly_budget.toLocaleString()}/month budget is distributed across campaigns, with rationale for the allocation (e.g., awareness vs. conversion split, tier-based weighting).

4. **Creative Strategy:** Describe the ad creative approach for each format, including how creative varies by tier and funnel stage.
`);
    }

    if (hasDisplayAds) {
      const d = channels.display_ads!;
      taskParts.push(`#### Display & Programmatic Advertising

Design the display advertising program using **${resolveOther(d.platform, d.platform_other)}** with a **$${d.monthly_budget.toLocaleString()}/month** budget.${d.retargeting ? " **Retargeting is enabled.**" : ""}

Write:
1. **Campaign Architecture:** Design 3-4 display campaigns (awareness, engagement, ${d.retargeting ? "retargeting, " : ""}conversion). For each, provide: campaign name, objective, target segment/tier, estimated monthly spend, and key creative theme.

Present as a table:
| Campaign | Objective | Target | Monthly Spend | Creative Theme |
|---|---|---|---|---|

2. **Account Targeting:** How the ABM platform targets specific accounts — IP-based targeting, cookie matching, CRM list uploads, or intent-based audience building. Reference ${resolveOther(d.platform, d.platform_other)}'s specific capabilities.

3. **Budget Allocation:** How the $${d.monthly_budget.toLocaleString()}/month budget is distributed across campaigns.

${d.retargeting ? "4. **Retargeting Strategy:** Design the retargeting workflow — what triggers retargeting (site visit, content engagement, email click), what creative is served, and how retargeting audiences are segmented by tier and engagement level.\n" : ""}
`);
    }
  }

  // --- Events & Community Section ---
  if (hasEvents || hasWebIntel || hasIntentData) {
    taskParts.push(`<!-- SECTION: events_community -->
### Events & Community Strategy

Design the events and community engagement strategy for the ABM program.
`);

    if (hasEvents) {
      const ev = channels.events!;
      taskParts.push(`#### Events Calendar & Strategy

Design the ABM events program with **${ev.annual_event_count} events per year** using these event types: **${ev.types.map((t) => t.replace(/_/g, " ")).join(", ")}**.

Write:
1. **Annual Events Calendar:** Design a 12-month events calendar with ${ev.annual_event_count} events. For each event, provide: event name/type, target quarter, target tier/segment, format, estimated attendees from target accounts, and primary objective.

Present as a table:
| Event | Quarter | Type | Target Tier | Est. Target Attendees | Objective |
|---|---|---|---|---|---|

2. **Pre-Event ABM Plays:** How target accounts are identified, invited, and engaged before each event type. Include personalization by tier.

3. **Post-Event Follow-Up:** The follow-up workflow for each tier — what happens within 24 hours, 1 week, and 1 month after the event for attendees vs. no-shows from target accounts.
`);
    }

    if (hasWebIntel) {
      const wi = channels.website_intelligence!;
      taskParts.push(`#### Website Intelligence

Design the website intelligence workflow using **${resolveOther(wi.platform, wi.platform_other)}**.

Write:
1. **Identification Workflow:** How ${resolveOther(wi.platform, wi.platform_other)} identifies target account visits, what data is captured, and how alerts are routed to sales.

2. **Engagement Triggers:** Define 3-5 website behaviors that trigger ABM plays (e.g., pricing page visit, multiple visits in a week, specific content consumption patterns). For each trigger, define the automated response.

Present as a table:
| Trigger | Behavior | Response | Owner | SLA |
|---|---|---|---|---|

3. **Integration with Outbound:** How website intelligence data feeds into email sequences, ad targeting, and sales outreach for coordinated follow-up.
`);
    }

    if (hasIntentData) {
      const intentTool = resolveOther(
        input.tech_stack.intent_data!,
        input.tech_stack.intent_data_other
      );
      taskParts.push(`#### Intent Data Strategy

Design the intent data strategy using **${intentTool}**.

Write:
1. **Intent Signal Framework:** Define the intent signals that matter for this client's ABM program — what topics, keywords, and competitor research activities indicate buying intent. Map signals to funnel stages.

2. **Signal-to-Action Mapping:** For each intent signal level (low, medium, high, surge), define the automated ABM response:

| Intent Level | Signal Criteria | Marketing Action | Sales Action | Response SLA |
|---|---|---|---|---|

3. **Enrichment & Scoring:** How intent data from ${intentTool} integrates with the CRM and account scoring model to prioritize outreach.
`);
    }
  }

  const user = `${context}

${priorSections}

${segments}

${offers}

${channelsDetail}

${techStack}

---

${taskParts.join("\n")}`;

  return { system: ABM_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 3: Infrastructure — Tech Stack Architecture + Sales-Marketing Alignment
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: tech_stack_architecture -->
 * - <!-- SECTION: sales_marketing_alignment -->
 */
export function buildInfrastructurePrompt(
  input: AbmPlanInput,
  accumulated: string[]
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorSections = summarizePriorSections(accumulated);
  const techStack = formatTechStackForContext(input.tech_stack);
  const channelsSummary = formatChannelsForContext(input.channels);
  const programSettings = formatProgramSettings(input);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["target_market", "goals"]
  );

  const user = `${context}

${priorSections}

${techStack}

${channelsSummary}

${programSettings}

${roadmapContext}

---

# Task: Write Infrastructure Sections (Tech Stack Architecture + Sales-Marketing Alignment)

Write two markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables, diagrams (as text), and structured formatting.

<!-- SECTION: tech_stack_architecture -->
### Tech Stack Architecture & Data Flow

Design the complete ABM tech stack architecture based on the configured tools.

1. **Stack Overview:** Present the tech stack as a layered architecture table:

| Layer | Tool | Role in ABM Program |
|---|---|---|

Layers should include: CRM, Marketing Automation (if configured), Data Enrichment, Intent Data (if configured), Outbound (if email enabled), Advertising (if ads enabled), Website Intelligence (if configured), Workflow Automation (if configured), and Analytics.

2. **Data Flow Architecture:** Describe the data flow between systems in a step-by-step narrative:
   - How new target accounts enter the system (enrichment → CRM → segmentation)
   - How engagement data flows from channels back to the CRM
   - How intent signals trigger outbound and advertising workflows
   - How lead scoring and account scoring are maintained
   - How reporting data is aggregated

3. **Integration Requirements:** For each tool-to-tool integration, specify:
   - What data is synced
   - Direction (one-way or bidirectional)
   - Sync frequency (real-time, hourly, daily)
   - Integration method (native, API, workflow automation)

Present as a table:
| Source | Destination | Data | Direction | Frequency | Method |
|---|---|---|---|---|---|

4. **Account Scoring Model:** Design an account engagement scoring framework with:
   - Score components (fit score + engagement score + intent score)
   - Specific actions and their point values
   - Threshold definitions (cold, warm, hot, AQL)
   - Decay rules for aging engagement

<!-- SECTION: sales_marketing_alignment -->
### Sales-Marketing Alignment & Lead Management

Design the operational model for sales-marketing collaboration in the ABM program.

1. **Account Qualification Framework:** Define the progression from target account to customer:
   - **Target Account (TA):** Meets ICP criteria, on the target list
   - **Engaged Account (EA):** Has shown meaningful engagement (define threshold)
   - **Account Qualified Lead (AQL):** Meets agreed engagement + fit criteria for sales follow-up (define specific criteria)
   - **Sales Accepted (SA):** Sales has accepted and begun working the account
   - **Opportunity:** Active deal in pipeline

2. **SLA Details:** Based on the configured SLA window${input.sales_follow_up_sla_hours ? ` of ${input.sales_follow_up_sla_hours} hours` : ""}, define:
   - Response time by tier (Tier 1: fastest, Tier 3: standard)
   - Escalation procedures if SLA is missed
   - Feedback loop requirements

3. **Meeting Cadence:** Define the regular alignment meetings:

| Meeting | Frequency | Attendees | Agenda | Output |
|---|---|---|---|---|

4. **Reporting & Dashboards:** Define 3-4 shared dashboards:
   - What metrics each dashboard shows
   - Who the primary audience is
   - Update frequency`;

  return { system: ABM_PLAN_SYSTEM_PROMPT, user };
}

/**
 * Call 4: Execution — Measurement Framework + Launch Plan
 *
 * Produces markdown with SECTION markers:
 * - <!-- SECTION: measurement_framework -->
 * - <!-- SECTION: launch_plan -->
 */
export function buildExecutionPrompt(
  input: AbmPlanInput,
  accumulated: string[]
): { system: string; user: string } {
  const context = buildContextBlock(input);
  const priorSections = summarizePriorSections(accumulated);
  const roadmapContext = summarizeRoadmapForContext(
    input.roadmap as Record<string, unknown>,
    ["goals", "roadmap_phases"]
  );
  const channelNames = getEnabledChannelNames(input.channels);
  const programSettings = formatProgramSettings(input);
  const segments = formatTargetSegments(input.target_segments);

  const user = `${context}

${priorSections}

${roadmapContext}

${segments}

${programSettings}

**Enabled Channels:** ${channelNames.map((c) => c.replace(/_/g, " ")).join(", ")}

---

# Task: Write Execution Sections (Measurement Framework + Launch Plan)

Write two markdown sections, each preceded by an HTML comment marker. Write in professional narrative prose with tables, bullet lists, and bold text.

<!-- SECTION: measurement_framework -->
### Measurement Framework & KPIs

Design the comprehensive ABM measurement framework. Follow the account-level measurement hierarchy (coverage → awareness → engagement → pipeline → revenue).

1. **Coverage Metrics:** 3-4 KPIs measuring target account database completeness and contact coverage

| Metric | Target | Data Source | Review Cadence |
|---|---|---|---|

2. **Awareness Metrics:** 3-4 KPIs measuring target account awareness of the brand

| Metric | Target | Data Source | Review Cadence |
|---|---|---|---|

3. **Engagement Metrics:** 4-6 KPIs measuring target account engagement across channels

| Metric | Target | Data Source | Review Cadence |
|---|---|---|---|

4. **Pipeline Metrics:** 3-4 KPIs measuring pipeline generation and velocity from target accounts

| Metric | Target | Data Source | Review Cadence |
|---|---|---|---|

5. **Revenue Metrics:** 3-4 KPIs measuring revenue impact and ROI

| Metric | Target | Data Source | Review Cadence |
|---|---|---|---|

6. **Channel-Specific Metrics:** For each enabled channel (${channelNames.map((c) => c.replace(/_/g, " ")).join(", ")}), define 2-3 channel-specific performance metrics.

All targets should be realistic for the client's stage, grounded in the roadmap's goals, and appropriate for the number of target accounts and channels enabled.

<!-- SECTION: launch_plan -->
### Launch Plan & 30/60/90-Day Timeline

Design the phased launch plan for the ABM program.${input.launch_timeline ? ` The client has specified a **${input.launch_timeline.replace(/_/g, " ")}** launch timeline.` : ""}

#### Phase 1: Foundation (Days 1-30)

Present 6-8 milestones as a table:

| # | Milestone | Owner | Target Date | Dependencies | Success Criteria |
|---|---|---|---|---|---|

Milestones should cover: tech stack setup and integration, target account list finalization, account enrichment, sales-marketing SLA agreement, initial content/offer development, and team training.

#### Phase 2: Activate (Days 31-60)

Present 5-7 milestones in the same table format.

Milestones should cover: first channel launches (start with primary channels), Tier 1 account engagement begins, initial campaign deployment, first performance check-in, and iteration based on early signals.

#### Phase 3: Optimize & Scale (Days 61-90)

Present 5-7 milestones in the same table format.

Milestones should cover: secondary channel activation, Tier 2/3 program launch, first monthly review cycle, optimization based on data, scaling playbooks, and establishing ongoing cadence.

#### Ongoing Operational Cadence

After the 90-day launch, define the steady-state operational rhythm:
- Daily activities
- Weekly activities
- Monthly review cycle
- Quarterly strategic review

Present as a table:
| Cadence | Activity | Owner | Output |
|---|---|---|---|

All milestones should align with the roadmap phases, reflect the realistic timeline for standing up an ABM program with ${channelNames.length} channels and ${input.target_segments.length} segments, and reference the specific tools and platforms configured.`;

  return { system: ABM_PLAN_SYSTEM_PROMPT, user };
}

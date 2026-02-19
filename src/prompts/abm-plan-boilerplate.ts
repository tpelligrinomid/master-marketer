/**
 * ABM Plan Boilerplate — Markdown Blocks
 *
 * Static markdown blocks injected between Claude-generated sections during
 * document assembly. Each block is pre-formatted markdown ready to be
 * concatenated into the full_document_markdown.
 *
 * Assembly order (sections 4-5 conditional based on enabled channels):
 *   1. Executive Summary — Claude Call 1
 *   2. Target Account Strategy — Claude Call 1 + ABM_TIER_METHODOLOGY boilerplate
 *   3. Offer Strategy & Conversion Architecture — Claude Call 1
 *   4. Outbound Channel Strategy — OUTBOUND_INTRO boilerplate + Claude Call 2 (if email or direct_mail)
 *   5. Paid Media & Advertising Strategy — PAID_MEDIA_INTRO boilerplate + Claude Call 2 (if linkedin_ads or display_ads)
 *   6. Event Management System — EVENT_MANAGEMENT_INTRO boilerplate + Claude Call 3
 *   7. Tech Stack Architecture & Data Flow — Claude Call 3
 *   8. Measurement Framework & KPIs — MEASUREMENT_INTRO boilerplate + Claude Call 4
 *   9. Launch Plan & 30/60/90-Day Timeline — LAUNCH_METHODOLOGY_INTRO boilerplate + Claude Call 4
 */

// ─────────────────────────────────────────────
// Section 2: Target Account Strategy
// ─────────────────────────────────────────────

export const ABM_TIER_METHODOLOGY = `### ABM Tier Methodology

Account-based marketing operates on three engagement tiers, each with distinct investment levels, personalization depth, and expected outcomes:

**Tier 1 — 1:1 (Strategic ABM)**
The highest-touch tier targeting a small number of named accounts (typically 5-25). Each account receives a fully customized engagement plan: bespoke content, personalized outreach, custom landing pages, dedicated sales alignment, and executive-level touchpoints. The cost-per-account is high, but so is the potential deal size. Every touchpoint is tailored to the account's specific business challenges, organizational structure, and buying committee.

**Tier 2 — 1:Few (ABM Lite)**
A mid-tier approach targeting clusters of accounts that share common characteristics — same industry, similar pain points, comparable company size, or overlapping tech stacks. Content and messaging are customized at the segment level rather than the individual account level. Typical cluster size is 10-50 accounts. Outreach is personalized by segment with account-specific hooks woven in.

**Tier 3 — 1:Many (Programmatic ABM)**
The broadest tier, using technology and automation to deliver account-relevant experiences at scale. Targets hundreds to thousands of accounts with dynamically personalized content, ads, and outreach based on firmographic and intent data. While less personalized than Tier 1 or 2, programmatic ABM still operates at the account level — not the lead level — distinguishing it from traditional demand generation.

The tier assignment for each target segment should reflect the segment's strategic value, deal size potential, and the organization's capacity to deliver personalized engagement at that level.`;

// ─────────────────────────────────────────────
// Section 4: Outbound Channel Strategy
// ─────────────────────────────────────────────

export const OUTBOUND_INTRO = `Outbound channels are the proactive arm of an ABM program — they initiate conversations rather than waiting for accounts to raise their hands. In account-based marketing, outbound is fundamentally different from traditional outbound sales: every touchpoint is informed by account intelligence, personalized to the recipient's role and business context, and coordinated across channels for maximum impact.

Effective ABM outbound follows three principles:

1. **Account-first sequencing** — Outreach is orchestrated at the account level, not the contact level. Multiple stakeholders within a target account receive coordinated but distinct messages that build a unified narrative.
2. **Signal-driven timing** — Outreach is triggered by intent signals, engagement data, or account events rather than arbitrary cadences. The right message at the right moment outperforms volume.
3. **Multi-threaded engagement** — Rather than relying on a single point of contact, outbound campaigns engage multiple members of the buying committee simultaneously, each with role-appropriate messaging.`;

// ─────────────────────────────────────────────
// Section 5: Paid Media & Advertising Strategy
// ─────────────────────────────────────────────

export const PAID_MEDIA_INTRO = `Paid media in an ABM context is fundamentally different from demand generation advertising. Instead of casting a wide net to generate leads at scale, ABM paid media targets specific accounts and buying committees with precision. The goal shifts from volume metrics (impressions, clicks, MQLs) to account-level engagement metrics (account reach, multi-stakeholder engagement, pipeline influence).

Key differences from demand gen paid media:

- **Targeting is account-based, not persona-based** — Ad platforms are configured to reach specific companies and job titles within those companies, not broad demographic or interest-based audiences
- **Success is measured by account penetration** — Did multiple stakeholders at the target account see and engage with the ads? Not just: did we get clicks?
- **Creative is segmented by tier and stage** — Tier 1 accounts may see company-specific messaging, while Tier 3 accounts see segment-level messaging. Awareness-stage accounts see thought leadership; decision-stage accounts see proof points
- **Budget allocation follows account value** — Higher-value accounts and more advanced pipeline stages receive proportionally more ad spend`;

// ─────────────────────────────────────────────
// Section 6: Event Management System
// ─────────────────────────────────────────────

export const EVENT_MANAGEMENT_INTRO = `The event management system is the intelligence layer of the ABM program — it transforms raw engagement signals from every channel into actionable account-level intelligence. Rather than treating "events" as physical gatherings, this system defines "events" as trackable engagement signals: email opens, replies, website visits, ad clicks, form submissions, and content downloads.

Built on a workflow automation platform, the event management system processes engagement signals in real-time, applies AI-powered classification to inbound replies, and routes qualified opportunities directly to sales. The sophistication lies not in the volume of data processed but in the intelligence applied to each signal.

The system serves three critical functions:

1. **Signal Processing** — Webhooks from email platforms, website intelligence tools, ad platforms, and CRM systems are received, validated, and transformed into standardized event records. Each event is tagged with an account ID, event type, source, and metadata for downstream analysis.
2. **Intelligent Classification** — Inbound signals that require human judgment (email replies, form submissions) are processed through AI classification to determine intent, urgency, and routing. This eliminates manual triage while ensuring no qualified opportunity is missed.
3. **Sales Notification & Handoff** — When engagement signals indicate buying intent, the system triggers immediate notifications to the appropriate sales representative with full account context, engagement history, and recommended next actions. SLA tracking ensures timely follow-up.`;

// ─────────────────────────────────────────────
// Section 9: Measurement Framework & KPIs
// ─────────────────────────────────────────────

export const MEASUREMENT_INTRO = `### Account-Level vs. Lead-Level Measurement

Traditional marketing measurement focuses on lead-level metrics: MQLs generated, cost per lead, lead-to-opportunity conversion rate. ABM measurement operates at a fundamentally different level — the account level.

This shift matters because B2B purchasing decisions are made by buying committees, not individual leads. A single MQL from a target account is meaningless if the other four members of the buying committee have never heard of you. Conversely, an account where five stakeholders have engaged with your content, attended your webinar, and visited your pricing page is deeply engaged — even if none of them have filled out a "contact us" form.

**ABM measurement hierarchy:**

1. **Coverage metrics** — Are we reaching the right accounts? What percentage of target accounts have we identified contacts for? How many stakeholders per account are in our database?
2. **Awareness metrics** — Do target accounts know we exist? Are we showing up in their research? Are our ads reaching the right people at the right companies?
3. **Engagement metrics** — Are target accounts interacting with us? Account engagement scores, content consumption, event attendance, email engagement — all measured at the account level, not the lead level.
4. **Pipeline metrics** — Is engagement converting to pipeline? Accounts entering pipeline, account-level pipeline velocity, deal size by tier.
5. **Revenue metrics** — Is pipeline converting to revenue? Account win rate, average deal size, customer lifetime value, expansion revenue from ABM-sourced accounts.

The measurement framework below follows this hierarchy, ensuring the program is evaluated on metrics that reflect the account-based model rather than defaulting to legacy lead-based measurement.`;

// ─────────────────────────────────────────────
// Section 10: Launch Plan & 30/60/90-Day Timeline
// ─────────────────────────────────────────────

export const LAUNCH_METHODOLOGY_INTRO = `### Phased Launch Rationale

ABM programs fail most often when organizations try to launch everything simultaneously. A phased approach reduces risk, enables learning loops, and builds organizational confidence before scaling.

The 30/60/90-day framework structures the launch into three phases:

**Phase 1 (Days 1-30): Foundation**
Stand up the core infrastructure, finalize target account lists, configure the tech stack, and align sales and marketing on the operating model. No outbound campaigns launch in this phase — the goal is to build the foundation that makes everything else work. Rushing past this phase is the single biggest predictor of ABM program failure.

**Phase 2 (Days 31-60): Activate**
Launch initial campaigns on primary channels, beginning with Tier 1 accounts where the engagement model is most defined. Start with one or two channels, measure response, and iterate messaging and targeting based on early signals. This phase is about learning, not scaling.

**Phase 3 (Days 61-90): Optimize & Scale**
Expand to additional channels and tiers based on Phase 2 learnings. Activate Tier 2 and Tier 3 programs, introduce secondary channels, and establish the ongoing operational cadence. By the end of this phase, the program should be running on its steady-state model with clear metrics, regular review cycles, and a defined optimization process.`;

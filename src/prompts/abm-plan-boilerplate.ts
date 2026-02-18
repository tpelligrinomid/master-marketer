/**
 * ABM Plan Boilerplate — Markdown Blocks
 *
 * Static markdown blocks injected between Claude-generated sections during
 * document assembly. Each block is pre-formatted markdown ready to be
 * concatenated into the full_document_markdown.
 *
 * Assembly order (sections 4-6 conditional based on enabled channels):
 *   1. Executive Summary — Claude Call 1
 *   2. Target Account Strategy — Claude Call 1 + ABM_TIER_METHODOLOGY boilerplate
 *   3. Offer Strategy & Conversion Architecture — Claude Call 1
 *   4. Outbound Channel Strategy — OUTBOUND_INTRO boilerplate + Claude Call 2 (if email or direct_mail)
 *   5. Paid Media & Advertising Strategy — PAID_MEDIA_INTRO boilerplate + Claude Call 2 (if linkedin_ads or display_ads)
 *   6. Events & Community Strategy — EVENTS_COMMUNITY_INTRO boilerplate + Claude Call 2 (if events, website_intelligence, or intent_data)
 *   7. Tech Stack Architecture & Data Flow — Claude Call 3
 *   8. Sales-Marketing Alignment & Lead Mgmt — SLA_FRAMEWORK boilerplate + Claude Call 3
 *   9. Measurement Framework & KPIs — MEASUREMENT_INTRO boilerplate + Claude Call 4
 *  10. Launch Plan & 30/60/90-Day Timeline — LAUNCH_METHODOLOGY_INTRO boilerplate + Claude Call 4
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
// Section 6: Events & Community Strategy
// ─────────────────────────────────────────────

export const EVENTS_COMMUNITY_INTRO = `Events are among the highest-impact touchpoints in an ABM program because they create real human connections that digital channels cannot replicate. In an account-based context, events are not just lead capture mechanisms — they are strategic engagement plays designed to accelerate relationships with specific target accounts.

ABM event strategy differs from traditional event marketing in three ways:

1. **Pre-event targeting** — Target accounts are identified and invited before the event. The event itself is a touchpoint in a broader orchestrated campaign, not a standalone activity.
2. **During-event engagement** — Sales and marketing collaborate to ensure meaningful interactions with target account attendees. This includes pre-scheduled meetings, personalized booth experiences, and real-time intent capture.
3. **Post-event follow-up** — Event engagement data feeds back into the ABM program. Attendees from target accounts receive tailored follow-up sequences, and non-attendees from those accounts receive "sorry we missed you" nurture streams.

Website intelligence and intent data tools extend this philosophy into the digital realm — identifying which target accounts are actively researching relevant topics and visiting your site, enabling proactive and timely engagement.`;

// ─────────────────────────────────────────────
// Section 8: Sales-Marketing Alignment & Lead Mgmt
// ─────────────────────────────────────────────

export const SLA_FRAMEWORK = `### Sales-Marketing SLA Framework

A service-level agreement (SLA) between sales and marketing is the operational backbone of any ABM program. Without clear commitments on both sides, account engagement stalls — marketing generates interest that sales never follows up on, or sales demands leads that marketing cannot qualify.

The ABM SLA defines:

**Marketing Commitments:**
- Deliver account-qualified leads (AQLs) that meet agreed-upon criteria for account fit, engagement level, and buying stage
- Provide sales with account intelligence packages for Tier 1 accounts (org charts, pain points, engagement history, intent signals)
- Maintain and update target account lists on an agreed cadence
- Deliver campaign performance data and account engagement scores

**Sales Commitments:**
- Follow up on Tier 1 AQLs within the agreed SLA window (typically 2-4 hours)
- Follow up on Tier 2 AQLs within the agreed SLA window (typically 24-48 hours)
- Log all account interactions in CRM for closed-loop reporting
- Provide feedback on lead quality and account intelligence accuracy
- Participate in weekly/biweekly ABM alignment meetings

**Shared Commitments:**
- Joint account planning sessions for Tier 1 accounts (quarterly)
- Shared dashboard visibility into pipeline and engagement metrics
- Regular review and refinement of AQL criteria
- Collaborative win/loss analysis to improve targeting and messaging`;

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

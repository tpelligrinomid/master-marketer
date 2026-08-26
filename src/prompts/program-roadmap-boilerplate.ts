import { ROADMAP_BOILERPLATE, PROCESS_TIMELINE } from "./roadmap-boilerplate";

/**
 * Program Roadmap section boilerplate.
 *
 * Injected by the assembler, per option — Claude never writes these, and nobody
 * should budget tokens for them or expect them to vary between options.
 *
 * Reuses the points roadmap's copy for every section that describes the client,
 * and replaces only the two that are specific to this path: the hours plan (which
 * replaces the points plan) and the executive summary (which the points path has
 * no equivalent of).
 */

const HOURS_PLAN_DESCRIPTION =
  "With one monthly price, you get access to a team who can develop a strategy and execute it. Every task below is estimated in hours, drawn from our process library, and adjusted where your situation calls for more or less than the standard. Strategy and account management are planned as line items alongside the work itself — coordination is work, and it is billed the same way. The plan covers the first three months of the engagement, and your strategist can move hours between tasks as priorities shift.";

const EXECUTIVE_SUMMARY_DESCRIPTION =
  "This summary sets out what the research and our conversations point to, what each option buys, and which one we recommend. The options are alternatives — each is a complete plan for the same engagement at a different level of investment. They are not phases and they are not added together.";

export const PROGRAM_ROADMAP_BOILERPLATE = {
  executive_summary: EXECUTIVE_SUMMARY_DESCRIPTION,
  overview: ROADMAP_BOILERPLATE.overview,
  research_description: ROADMAP_BOILERPLATE.research_description,
  target_market: ROADMAP_BOILERPLATE.target_market,
  brand_story: ROADMAP_BOILERPLATE.brand_story,
  products_and_solutions: ROADMAP_BOILERPLATE.products_and_solutions,
  competition: ROADMAP_BOILERPLATE.competition,
  goals: ROADMAP_BOILERPLATE.goals,
  roadmap_phases: ROADMAP_BOILERPLATE.roadmap_phases,
  quarterly_initiatives: ROADMAP_BOILERPLATE.quarterly_initiatives,
  annual_plan: ROADMAP_BOILERPLATE.annual_plan,
  hours_plan: HOURS_PLAN_DESCRIPTION,
} as const;

export { PROCESS_TIMELINE };

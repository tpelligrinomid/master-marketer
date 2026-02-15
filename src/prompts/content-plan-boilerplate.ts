/**
 * Content Plan Section Boilerplate
 *
 * Static descriptions for each section of the Content Plan.
 * These are injected into the output during assembly — Claude does NOT generate them.
 * The frontend renders these as introductory text for each section.
 *
 * Edit the copy here. The schema just receives the string.
 */

export const CONTENT_PLAN_BOILERPLATE = {
  // ─────────────────────────────────────────────
  // Section 1: Overview
  // ─────────────────────────────────────────────
  overview:
    "A content plan is the strategic foundation for every piece of content your brand publishes. It answers three questions before a single word is written:\n\n1. **Who** are we creating content for?\n2. **Why** should they care?\n3. **How** will we consistently deliver value?\n\nWithout a documented plan, content efforts fragment — teams produce one-off assets that don't connect, messaging drifts, and results become impossible to measure. A content plan aligns stakeholders around a shared strategy and gives every contributor a north star.\n\nThis document includes: Foundation (mission, audiences, content categories, asset types, and content intelligence infrastructure), Brand Positioning & Messaging (the StoryBrand-based messaging framework), Content Program (the flagship content series), Workflow & Production (the step-by-step process from idea to published asset), Amplification (how content reaches its audience across owned, earned, and paid channels), Ongoing Management (the review cadence, metrics, and optimization process), and the AEO/SEO Strategy Appendix (the full search and answer-engine optimization layer).",

  // ─────────────────────────────────────────────
  // Section 2: Foundation
  // ─────────────────────────────────────────────
  foundation:
    "The foundation section establishes the building blocks of the content program. It defines the content mission, identifies the core content categories (topic pillars), selects the asset types the program will produce, and describes the content intelligence infrastructure that powers ongoing production. Every downstream decision — from program design to amplification strategy — flows from these foundational choices.",

  content_mission:
    "A content mission statement defines the intersection of your expertise and your audience's needs. It is not a tagline — it is an internal compass that helps every content creator decide \"does this piece belong in our program?\" A strong content mission statement answers: Who is the specific audience? What will they get from your content? Why does it matter to them? Keep it to one or two sentences. It should be specific enough to exclude topics that don't fit and broad enough to sustain years of content production.",

  content_categories:
    "Content categories are the 4–6 topic pillars that organize your entire content program. They serve two purposes: strategic focus (ensuring every piece of content maps to a business-relevant topic area) and audience expectation (over time, your audience learns what to expect from you). Each content category should map to a topic cluster for search optimization (see SEO/AEO Appendix).",

  asset_types:
    "Not every piece of content is an article. A modern content program leverages multiple asset types to reach audiences at different stages, in different contexts, and through different channels. The asset types selected here align with your ICPs' content preferences and your production capacity.",

  content_attributes:
    "Every piece of content carries attributes that determine where it fits in the strategy. Tagging content with these attributes enables performance analysis, gap identification, and strategic planning.\n\n**Buying Stages:**\n\n| Stage | Description | Content Purpose | Example Formats |\n|---|---|---|---|\n| **Awareness** | Prospect recognizes a problem or opportunity but hasn't started evaluating solutions | Educate, build trust, establish thought leadership | Blog posts, social content, podcast episodes, infographics |\n| **Consideration** | Prospect is actively researching approaches and comparing options | Demonstrate expertise, differentiate, nurture | Webinars, ebooks, comparison guides, case studies |\n| **Decision** | Prospect is ready to select a partner or solution | Prove ROI, reduce risk, enable action | Case studies, demos, ROI calculators, proposals |\n| **Customer Success** | Existing customer who can expand, renew, or refer | Retain, upsell, activate advocacy | Tutorials, advanced guides, community content, review requests |",

  content_brief:
    "A content brief is the handoff document between strategy and production. Every piece of content should have a brief before production begins. This ensures alignment on intent, audience, and success criteria. The brief template includes fields for strategy (asset type, content category, target ICP, buying stage, business objective), content (abstract, key points, target length), inputs & references (SME, reference materials, competitor content, database source assets), SEO/AEO (primary keyword, secondary keywords, target intent, schema type, snippet opportunity, AI answer target), distribution (primary channel, amplification plan, internal links), and approval workflow.",

  content_intelligence:
    "Most organizations have created far more content than they realize — it's scattered across websites, blog posts, PDFs, sales decks, webinar recordings, podcast episodes, internal documents, and strategy memos. Content intelligence infrastructure solves this by creating a centralized, searchable, AI-ready content database that powers the entire content program.\n\nThe infrastructure operates in three layers:\n\n**Layer 1 — Ingest:** All existing client content is collected and converted into a standardized format. This includes website content, documents, sales materials, recorded media, captured sessions, and internal materials.\n\n**Layer 2 — Enrich:** Content is automatically enriched with metadata including content category tagging, ICP alignment, buying stage tags, topic and entity extraction, vector embeddings for semantic search, and relationship mapping between content pieces.\n\n**Layer 3 — Activate:** The enriched database powers ongoing content production through semantic search, voice consistency, remix and repurpose capabilities, gap analysis, competitive positioning, and content brief enrichment.\n\nThe database grows continuously through structured capture sessions with subject matter experts and leadership. A single capture session can feed 4–8+ content assets because the database enables systematic extraction and remixing.",

  // ─────────────────────────────────────────────
  // Section 3: Brand Positioning & Messaging
  // ─────────────────────────────────────────────
  brand_positioning:
    "Establishing a distinct and resonant brand story is a crucial part of everything developed in the content program. This section synthesizes the StoryBrand framework from the marketing roadmap into messaging guidelines that ensure every piece of content — from blog posts to video episodes — reinforces a consistent narrative.",

  storybrand_methodology:
    "We use Donald Miller's StoryBrand Framework to structure brand messaging. The core insight: your customer is the hero of the story, not your brand. Your brand is the guide. This framework ensures every content piece reinforces a consistent narrative. The seven elements are: (1) A Character — your customer wants something, (2) Has a Problem — something stands in their way, (3) And Meets a Guide — your brand demonstrates empathy and authority, (4) Who Gives Them a Plan — a clear path forward, (5) And Calls Them to Action — direct and transitional CTAs, (6) That Helps Them Avoid Failure — what's at stake, and (7) And Ends in Success — the transformation they achieve.",

  // ─────────────────────────────────────────────
  // Section 4: Content Program
  // ─────────────────────────────────────────────
  content_program:
    "A content program is different from a content calendar. A calendar is a schedule. A program is a branded, recurring content series that becomes your flagship — the thing your audience knows you for. A flagship program matters because it builds consistency (audience habits and expectations), efficiency (repeatable format reduces production effort per episode), brand equity (the program itself becomes a brand asset), and serves as a repurposing engine (each episode generates multiple derivative assets). Most engagements should have one primary content program that anchors the strategy.",

  // ─────────────────────────────────────────────
  // Section 5: Content Workflow & Production
  // ─────────────────────────────────────────────
  content_workflow:
    "This section defines the step-by-step process from idea to published asset, powered by the content database. It covers the three-phase workflow, the detailed production process, and the responsibilities matrix.",

  three_phase_workflow:
    "All content production flows through three phases:\n\n**Capture:** Raw material is gathered — interviews are recorded, research is conducted, data is collected, subject matter experts are tapped. All captured material is ingested into the content database, where it is transcribed, tagged, and vectorized for future use.\n\n**Produce:** Raw material is transformed into finished content. Writers and producers query the content database to surface relevant prior content, client quotes, and existing positions on the topic — ensuring every new piece builds on the client's established voice rather than starting from scratch.\n\n**Connect:** Finished content is published, distributed, and amplified. Published assets are logged back into the content database with performance metadata, creating a feedback loop that informs future production.",

  production_process:
    "The 12-step production process:\n\n| Step | Phase | Activity |\n|---|---|---|\n| 1 | Capture | Topic Identification & Planning — query the content database to identify coverage gaps |\n| 2 | Capture | Research & Preparation — search the content database for existing material on the topic |\n| 3 | Capture | Content Brief Creation — complete the content brief with SEO/AEO fields |\n| 4 | Capture | Recording / Capture Session — record video/podcast interview or conduct structured capture session |\n| 5 | Produce | Editing & Post-Production — edit video/audio, write/revise articles, design visual assets |\n| 6 | Produce | SEO/AEO Optimization — apply on-page SEO, schema markup, snippet formatting |\n| 7 | Produce | Client Review & Approval — one round of revisions included |\n| 8 | Produce | Final Quality Check — proofread, link check, schema validation, metadata verification |\n| 9 | Connect | Publishing — publish to primary channels |\n| 10 | Connect | Distribution — push to owned channels |\n| 11 | Connect | Amplification — activate paid promotion, outreach, employee advocacy |\n| 12 | Connect | Performance Tracking — monitor initial performance at 48-hour, 1-week, 1-month checkpoints |",

  raci_matrix:
    "**RACI Responsibilities Matrix:**\n\n| Activity | Client | Agency Strategist | Agency Producer | Agency Designer |\n|---|---|---|---|---|\n| Topic identification | C | R | I | I |\n| Content brief approval | A | R | C | I |\n| Recording / interview | R | C | R | I |\n| Writing / editing | C | R | R | I |\n| Design / visual production | C | C | I | R |\n| SEO/AEO optimization | I | R | R | I |\n| Final approval | A | R | R | R |\n| Publishing | I | A | R | I |\n| Social media distribution | C | R | R | R |\n| Paid promotion | A | R | I | C |\n| Performance reporting | I | R | C | I |\n| Content database maintenance | C | R | R | I |\n\n**Legend:** R = Responsible, A = Accountable (approver), C = Consulted, I = Informed",

  // ─────────────────────────────────────────────
  // Section 6: Content Amplification
  // ─────────────────────────────────────────────
  content_amplification:
    "Creating great content is only half the job. Without a deliberate amplification strategy, even the best content reaches a fraction of its potential audience. The rule of thumb: spend as much effort distributing content as you do creating it. Amplification operates across three channel types — owned, earned, and paid — plus targeted account-based marketing (ABM) when applicable.",

  // ─────────────────────────────────────────────
  // Section 7: Ongoing Management & Optimization
  // ─────────────────────────────────────────────
  ongoing_management:
    "Content strategy is never \"done.\" This section defines the review cadence, metrics, and optimization process that ensures the program stays aligned with business goals, adapts to what's working, and evolves with the audience.",

  monthly_review:
    "The 6-Step Monthly Review Cycle:\n\n1. **Gather Data** — Pull performance data from all channels (GA4, social analytics, email platform, YouTube Studio, podcast analytics, SEO tools)\n2. **Analyze** — Compare actual performance against goals and benchmarks. Identify top and bottom performers. Look for patterns across content categories, asset types, and channels\n3. **Insights** — Go beyond \"what\" to \"why.\" Why did certain pieces outperform? Was it the topic, format, distribution, timing, or promotion?\n4. **Recommend** — Based on insights, what should change? New topics to pursue, formats to try, channels to invest in, content to refresh\n5. **Plan** — Update the content calendar for the next month. Reprioritize topics, allocate resources, and schedule production\n6. **Execute** — Implement the changes and begin the next production cycle",

  quarterly_audit:
    "Perform a comprehensive content audit every quarter covering:\n\n- **Content database health** — Is all published and captured content ingested? Are tags current?\n- **Content inventory** — Is all published content cataloged with correct attributes?\n- **Performance review** — Which pieces exceeded / missed benchmarks?\n- **Category balance** — Are all content categories being served?\n- **ICP coverage** — Does each ICP have content at every buying stage?\n- **SEO health check** — Any technical issues? Rankings trending up or down?\n- **Competitive analysis** — What are competitors publishing? Any new threats or opportunities?\n- **Brand consistency** — Is messaging aligned with the StoryBrand framework?\n- **Asset freshness** — Any content with outdated data, broken links, or stale references?\n- **Conversion paths** — Are CTAs performing? Are content-to-lead paths working?\n- **Team feedback** — What's working well in the production process? What's painful?",

  refresh_retirement:
    "**Refresh Criteria (update existing content):**\nA content piece should be refreshed when: it is more than 12 months old and still receives traffic; rankings have dropped from page 1 to page 2+ for target keywords; the information is no longer accurate; a competitor has published a superior piece on the same topic; the content has high impressions but low CTR; new internal content exists that should be cross-linked.\n\n**Retirement Criteria (remove or redirect):**\nA content piece should be retired when: it receives zero meaningful traffic for 6+ months and has no backlink value; the topic is no longer relevant to the business or audience; the content contradicts current brand positioning or messaging; it targets a keyword or topic that is better served by another piece.\n\nWhen retiring content: always redirect (301) the URL to the most relevant active page to preserve any link equity.",

  // ─────────────────────────────────────────────
  // Section 8: Next Steps & Action Items
  // ─────────────────────────────────────────────
  next_steps:
    "This section provides the 30/60/90-day roadmap for launching the content program, from initial onboarding through to establishing the ongoing production cadence.",

  onboarding_checklist:
    "Complete these items to kick off the content engagement:\n\n1. Schedule kickoff meeting with client stakeholders\n2. Conduct discovery interviews (sales, CS, leadership)\n3. Gather existing brand guidelines, style guides, and past content\n4. Define content ingestion scope\n5. Ingest existing content into content database\n6. Audit existing content using database analysis\n7. Complete ICP empathy maps\n8. Define content categories\n9. Complete StoryBrand framework\n10. Design content program\n11. Develop visual framework\n12. Run baseline SEO/AEO audit\n13. Set up analytics and tracking\n14. Present content plan to client for approval",

  // ─────────────────────────────────────────────
  // Appendix: SEO/AEO Strategy
  // ─────────────────────────────────────────────
  seo_aeo_appendix:
    "This appendix provides the full search engine optimization (SEO) and answer-engine optimization (AEO) layer for the content plan. It includes both methodology and actionable recommendations. Sections cross-reference the content plan where strategy decisions overlap.",

  aeo_seo_intro:
    "Search engine optimization (SEO) and answer engine optimization (AEO) are no longer separate disciplines — they are two expressions of the same goal: making your content the definitive answer to your audience's questions.\n\nSEO ensures your content is discoverable, crawlable, and ranked in traditional search engine results pages (SERPs). AEO ensures your content is selected, cited, and surfaced by AI-powered answer engines.\n\nIn 2026, both matter because: Google AI Overviews now appear for a significant share of queries; ChatGPT, Perplexity, and Microsoft Copilot are being used as primary research tools by B2B decision-makers; voice assistants rely on structured, authoritative content; and traditional organic results still drive the majority of website clicks for commercial and transactional queries.\n\nThe organizations that win are those that optimize for both: structuring content for AI consumption while maintaining the technical and authority foundations that search engines require.",

  content_structure_guidelines:
    "Content structure for AI consumption follows six principles:\n\n1. **Front-Load Answers** — AI systems extract answers from the first few sentences after a heading. Don't bury the answer.\n2. **Claim → Evidence → Conclusion Pattern** — Structure paragraphs for maximum extractability.\n3. **Bold Key Phrases** — Use bold text to highlight important phrases and definitions that AI systems use as signals.\n4. **Lists and Tables Liberally** — Lists and tables are the most extractable content formats.\n5. **Natural Language Q&A Pairs** — Include question-and-answer formatted sections using actual questions your audience asks.\n6. **Definitive Statements** — AI answer engines prefer clear, confident statements over hedging.",

  snippet_optimization:
    "Featured snippets (position zero) appear above regular organic results and are the primary source for voice search answers. Winning a featured snippet also increases the chance of being cited in AI Overviews.\n\nSnippet types: Paragraph (40–60 word text answer), List (numbered or bulleted), Table (data comparison), and Video (YouTube with timestamps).\n\nThe \"Snippet Bait\" methodology: (1) Identify queries where your page ranks in positions 1–10 but doesn't hold the snippet, (2) Analyze the current snippet holder's format, (3) Add a section specifically formatted to win — use the exact query as a heading, immediately follow with a concise answer, ensure the answer is self-contained, (4) Surround with supporting content for depth and authority.",

  video_podcast_seo:
    "Video and podcast content have unique SEO and AEO requirements.\n\n**YouTube SEO:** Optimize title (include primary keyword, under 60 chars), description (primary keyword + summary in first 2 lines, 200–500 words total), tags (5–10 relevant), chapters/timestamps, custom thumbnails, accurate captions, end screens/cards, and playlists organized by content category.\n\n**Podcast SEO:** Optimize episode title (descriptive, keyword-rich), show notes (200–500 word summary), full transcript on website episode page, RSS feed metadata, and dedicated website episode pages with transcript, show notes, embedded player, and FAQ section.\n\n**Transcript-to-Article Optimization:** Generate transcript → edit for readability → extract 3–5 key themes → write SEO-optimized blog recap → embed video/audio player → apply Article + VideoObject/PodcastEpisode schema → include FAQ section → publish to relevant topic cluster.",

  measurement_templates:
    "**Monthly SEO Dashboard metrics:** Organic search sessions, organic search users, organic conversion rate, organic leads/conversions, Domain Authority/Domain Rating, total referring domains, total backlinks, indexed pages, keywords ranking in top 3/10/50, featured snippets held.\n\n**Monthly AEO Dashboard metrics:** Google AI Overview citations, featured snippets held, PAA appearances, brand mentions in ChatGPT/Perplexity/Copilot (standard query set), total AI citations across all engines.\n\n**AI Answer Monitoring Process:** Define 20–30 standard queries representing core topics → monthly, run each through Google AI Overview, ChatGPT, Perplexity, and Copilot → log brand mentions, URL citations, answer content, and competitor citations → track trends month-over-month → identify which content earns citations → inform content optimization priorities.",

  ongoing_seo_management:
    "**Monthly SEO Tasks:** Review Google Search Console for errors, monitor Core Web Vitals, update keyword rankings, review new backlinks, publish and optimize new content, update internal links, run AI answer monitoring queries, review featured snippet positions, prepare monthly report, present findings.\n\n**Quarterly Refresh Cycle:** Re-run keyword research, content performance audit, refresh top performers, competitive content analysis, schema audit, technical SEO audit, link building pipeline review, AEO strategy review.\n\n**Algorithm Update Response Playbook:** (1) Observe — Days 1–14, do NOT make panic changes; (2) Analyze — Days 14–21, compare affected vs unaffected pages; (3) Diagnose — Days 21–30, determine if update targeted something specific; (4) Respond — Days 30+, focus on content quality and E-E-A-T; (5) Monitor — Ongoing, track recovery over 4–8 weeks.",
} as const;

export type ContentPlanSection = keyof typeof CONTENT_PLAN_BOILERPLATE;

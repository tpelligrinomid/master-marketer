# 

# 

# 

**ABM Plan**  
*Rugged Robotics*

# 

*September 24, 2025*

**Table of Contents** 

[Executive Summary	4](#executive-summary)

[Program Architecture Overview	5](#program-architecture-overview)

[Layer 1: Marketing Activities (Engagement Layer)	5](#layer-1:-marketing-activities-\(engagement-layer\))

[Layer 2: Event Management (Intelligence Layer)	5](#layer-2:-event-management-\(intelligence-layer\))

[Layer 3: Data Management (Storage & Reporting Layer)	6](#layer-3:-data-management-\(storage-&-reporting-layer\))

[Target Audience Definition	6](#target-audience-definition)

[Market Segmentation Rationale	6](#market-segmentation-rationale)

[Construction Segment: Data Center & Mission-Critical Facilities	7](#construction-segment:-data-center-&-mission-critical-facilities)

[Industrial Automation Segment: Warehouse Systems Integrators	8](#industrial-automation-segment:-warehouse-systems-integrators)

[Offer Strategy & Content Framework	10](#offer-strategy-&-content-framework)

[Core Offer Architecture	10](#core-offer-architecture)

[Content Engagement Journey	11](#content-engagement-journey)

[Content Distribution Strategy	13](#content-distribution-strategy)

[List Building & Data Enrichment	14](#list-building-&-data-enrichment)

[Clay Workflow Architecture	14](#clay-workflow-architecture)

[Suppression Management System	15](#suppression-management-system)

[Data Quality Standards	15](#data-quality-standards)

[Multi-Channel Orchestration	16](#multi-channel-orchestration)

[Email Sequences via SmartLead	16](#email-sequences-via-smartlead)

[LinkedIn Advertising Architecture	18](#linkedin-advertising-architecture)

[Display Advertising via AdRoll	19](#display-advertising-via-adroll)

[Event Management System	20](#event-management-system)

[n8n Workflow Architecture	20](#n8n-workflow-architecture)

[AI Reply Classification Logic	21](#ai-reply-classification-logic)

[Sales Handoff Process	22](#sales-handoff-process)

[Event Taxonomy	23](#event-taxonomy)

[Data Management & Integration	23](#data-management-&-integration)

[Supabase Schema Design	24](#supabase-schema-design)

[Data Flow Orchestration	25](#data-flow-orchestration)

[System Integration Patterns	26](#system-integration-patterns)

[ABM Program Management	26](#abm-program-management)

[Weekly Optimization Cadence	26](#weekly-optimization-cadence)

[Reply Management SLAs	28](#reply-management-slas)

[Adjustment and Refinement Strategies	29](#adjustment-and-refinement-strategies)

[Performance Measurement	30](#performance-measurement)

[KPI Framework	30](#kpi-framework)

[Attribution Modeling	30](#attribution-modeling)

[Reporting Dashboard Architecture	30](#reporting-dashboard-architecture)

## **Executive Summary** {#executive-summary}

The construction industry loses billions annually to layout delays and precision failures. For data center builders and warehouse automation integrators, a single layout error cascades into weeks of delays, costing **$150,000 to $1,000,000 per day** in lost revenue. Traditional chalk-and-spray methods deliver ±1/4" accuracy at best, while modern automated systems demand ±2mm precision. This gap represents both a massive market failure and an extraordinary opportunity.

Rugged Robotics transforms three-day manual layouts into six-hour robotic precision operations. Their robotic layout systems eliminate 95% of layout-related rework, reduce layout time by 70-80%, and enable facilities to open 2-4 weeks earlier. For enterprises building mission-critical infrastructure, this isn't just an efficiency gain—it's a competitive advantage that compounds across every project.

This Account-Based Marketing (ABM) program targets 2,000 high-value accounts across two segments: data center construction giants ($500M-$100B+ revenue) and warehouse automation systems integrators ($500M-$5B revenue). Through coordinated email sequences, LinkedIn advertising, website intelligence, and automated event tracking at the account-level, the system aims to build brand presence across all touchpoints.

**Key Program Benefits:**

- **Precision Targeting**: Focus resources initially on \~5,000 accounts with the highest revenue potential  
- **Multi-Channel Orchestration**: Coordinate email, LinkedIn, display ads, and website tracking  
- **AI-Powered Efficiency**: Automatically classify replies and route qualified leads  
- **Account-Level Intelligence**: Track engagement without personally identifiable information  
- **Scalable Architecture**: Support thousands of emails weekly with automated suppression

## **Program Architecture Overview** {#program-architecture-overview}

The ABM platform operates on a three-layer architecture designed to maximize engagement, gather signals and report on the right data. 

At its core, the system philosophy prioritizes account-level tracking over individual contact monitoring. This approach provides comprehensive visibility into buying committee engagement without the technical complexity of personal data tracking. By storing account events in Supabase and contact details in HubSpot—with no synchronization between them—the architecture maintains complete data isolation while enabling sophisticated multi-touch attribution.

### **Layer 1: Marketing Activities (Engagement Layer)** {#layer-1:-marketing-activities-(engagement-layer)}

The engagement layer represents all touchpoints where prospects interact with Rugged Robotics' brand. Clay serves as the foundation for list building and enrichment, automatically checking HubSpot for existing accounts before launching campaigns. SmartLead orchestrates email sequences across alternative domains (rugged-robotics.co, ruggedrobotics.co, ruggedrobotics.io), maintaining sending limits of 60-80 emails daily per mailbox after a two-week warmup period. LinkedIn and AdRoll deliver targeted advertising to custom audiences built from SmartLead campaigns, while Factors.ai identifies anonymous website visitors and tracks cross-channel account journeys.

### **Layer 2: Event Management (Intelligence Layer)** {#layer-2:-event-management-(intelligence-layer)}

The intelligence layer processes all engagement signals through n8n, which acts as the central nervous system of the ABM platform. This hub receives webhooks from SmartLead for email interactions, processes website visit data from Factors.ai, and applies AI classification to determine reply intent. The AI categorizes responses into four buckets: interested, unsubscribe, out\_of\_office, and not\_relevant. Positive replies trigger immediate notifications via Slack and email, ensuring sales teams respond within the defined SLA window. n8n also appropriately updates contacts in HubSpot with campaign-level information, such as when a campaign started or ended in Smartlead. These types of contacts are flagged as non-marketing contacts and do not count against the pricing tier for HubSpot. 

### **Layer 3: Data Management (Storage & Reporting Layer)** {#layer-3:-data-management-(storage-&-reporting-layer)}

The storage layer maintains strict separation between account and contact data. Supabase stores all account-level events for reporting and scoring, tracking engagement patterns without personally identifiable information. HubSpot manages contact records and CRM data in complete isolation, with Clay performing real-time suppression checks to prevent duplicate outreach. Databox consolidates reporting from both systems, providing unified dashboards without compromising data separation. This architecture enables comprehensive attribution without the need for an enterprise-level ABM software stack.

![][image1]

## **Target Audience Definition** {#target-audience-definition}

The success of any ABM program depends on laser-focused targeting. Rugged Robotics addresses two distinct but equally valuable market segments, each facing unique challenges that robotic layout directly solves. Understanding these segments at a granular level—from company characteristics to individual buyer personas—enables precision messaging that resonates at every level of the organization.

### **Market Segmentation Rationale** {#market-segmentation-rationale}

The construction industry isn't monolithic. Different sectors face vastly different layout challenges, timeline pressures, and precision requirements. By focusing on data center builders and warehouse automation integrators, Rugged Robotics targets organizations where layout precision directly impacts revenue, where delays cost hundreds of thousands daily, and where decision makers have both budget and urgency to adopt innovative solutions.

These segments share critical characteristics: they operate at massive scale, face severe penalties for delays, require millimeter-level precision, and compete on execution speed. More importantly, they represent concentrated buying power—a small number of large accounts control the majority of market opportunity. This concentration makes ABM not just effective but essential.

### **Construction Segment: Data Center & Mission-Critical Facilities** {#construction-segment:-data-center-&-mission-critical-facilities}

**Company Profile:**

- Revenue Range: $500M to $100B+  
- Project Scale: 50,000 to 500,000+ square feet per facility  
- Annual Projects: 5-50 data centers or mission-critical facilities  
- Geographic Scope: National or international operations  
- Key Players: DPR Construction, Turner Construction, Holder Construction, Fortis Construction

**Critical Pain Points:**

Data center construction operates on razor-thin margins and astronomical delay penalties. These builders face **$500,000 to $1,000,000 daily** in liquidated damages for late delivery. Layout represents the critical path for all subsequent trades—a two-day layout delay cascades into weeks of schedule compression. Traditional crews struggle with the scale and precision required for modern data centers, where cooling systems, power distribution, and server racks demand perfect alignment.

The pressure intensifies with hyperscale projects. When Google or Microsoft needs five data centers operational simultaneously, layout becomes the bottleneck. Manual crews can't scale across multiple sites without quality degradation. Even hiring additional crews introduces variability—different teams interpret plans differently, use different techniques, and deliver inconsistent results.

**Buyer Personas:**

*Senior Project Manager (Primary Decision Maker)* Jeff Martinez at DPR Construction exemplifies this persona. He manages $200M+ projects where every day matters. Jeff thinks in terms of critical path optimization and liquidated damages. He's seen layout errors cascade into million-dollar problems and knows that technology adoption differentiates winning contractors. His LinkedIn posts celebrate innovation, but his private conversations reveal deep anxiety about implementation risks. Jeff needs proven solutions with quantifiable ROI, preferably demonstrated on similar projects. He responds to messages about schedule compression, risk mitigation, and competitive differentiation.

*VP of Operations (Economic Buyer)* This executive owns P\&L responsibility across multiple projects. They evaluate technology investments through the lens of portfolio impact—how does this scale across all projects? They care less about technical specifications and more about business outcomes: win rates, margins, and client satisfaction. They've likely heard about Rugged Robotics from project managers but need financial justification. Messaging should emphasize enterprise value: standardization across projects, competitive advantage in proposals, and measurable margin improvement.

*BIM/VDC Director (Technical Influencer)* These technology champions understand the precision gap between design and field execution. They've invested millions in BIM software but watch helplessly as field crews translate their 3D models into chalk lines. They grasp the technical advantages immediately but need ammunition to convince leadership. They respond to technical accuracy data, integration capabilities, and digital verification features. Case studies showing BIM-to-field workflows resonate strongly.

### **Industrial Automation Segment: Warehouse Systems Integrators** {#industrial-automation-segment:-warehouse-systems-integrators}

**Company Profile:**

- Revenue Range: $500M to $5B  
- Project Types: Automated warehouses, distribution centers, manufacturing facilities  
- Technology Focus: AGV systems, robotic storage, conveyor networks  
- Key Players: Dematic, Swisslog, Symbotic, Intelligrated

**Critical Pain Points:**

Warehouse automation integrators live and die by precision. Their AGV systems require ±2mm accuracy for magnetic tape paths. Their conveyor systems must align perfectly with robotic cells. A quarter-inch layout error means complete system recalibration, weeks of delays, and massive rework costs. These companies often subcontract layout to construction partners who don't understand automation requirements, leading to constant conflicts and finger-pointing when systems don't align.

The problem compounds with portfolio scaling. Integrators pursuing aggressive growth targets need to deploy multiple facilities simultaneously. Traditional layout methods become the bottleneck—they can design five warehouses in parallel but can only lay out one at a time. This serialization destroys the economic benefits of parallel execution.

**Buyer Personas:**

*Project Engineering Director (Primary Decision Maker)* David Park at Dematic represents this critical persona. He oversees technical execution across multiple automation projects, where precision determines success. David thinks in millimeters, not inches. He's exhausted from managing layout subcontractors who don't understand automation tolerances. His desk displays photos of failed installations where conveyors didn't align with planned paths. David needs a solution that speaks his language—precision, repeatability, and digital verification. He'll champion any technology that eliminates layout as a failure point.

*VP of Project Delivery (Economic Buyer)* This executive manages portfolio profitability across all integration projects. They track margin erosion from rework, schedule compression costs, and liquidated damages. They've watched profitable projects turn into losses due to layout-related delays. They need solutions that protect margins and enable predictable delivery. Messaging should emphasize risk mitigation, margin protection, and scaling capabilities.

*Automation Systems Designer (Technical Influencer)* These engineers design the automated systems but don't control field execution. They specify ±2mm tolerances knowing traditional layout can't achieve them. They've redesigned systems to accommodate layout inaccuracies, adding cost and complexity. They immediately understand Rugged Robotics' value but need help building the business case. Technical documentation, accuracy certifications, and integration specifications resonate with this audience.

## **Offer Strategy & Content Framework** {#offer-strategy-&-content-framework}

The difference between a good ABM program and a great one lies in the offer strategy. While many B2B companies default to generic "request a demo" calls-to-action, ABM requires offers that provide immediate value while advancing the sales conversation. For Rugged Robotics, where the technology represents a paradigm shift in construction methods, the offer strategy must bridge the gap between curiosity and commitment.

### **Core Offer Architecture** {#core-offer-architecture}

The program's primary offer—"Start with a pilot project"—represents a pragmatic entry point for risk-averse construction leaders. Unlike software that can be tested in a sandbox, robotic layout must prove itself on real job sites with real deadlines. The pilot project offer acknowledges this reality while lowering the barrier to adoption.

At this point, we will launch the ABM efforts with one primary offer. As we get more data and continue to build content, we can introduce additional offers along the way. 

**Pilot Project Offer Framework:** The pilot project form captures essential qualification data while maintaining simplicity. Prospects provide company information, project location, estimated floor area (typically 50,000-200,000 sq ft for pilots), layout scope (MEP, walls, equipment mounting points), and timeline. This information immediately qualifies the opportunity and enables intelligent sales follow-up. The form deliberately avoids overwhelming technical questions—those conversations happen after initial interest is established.

The advantage of this offer lies in its mutual commitment. Prospects must have a real project with real deadlines, automatically filtering out casual browsers. Meanwhile, Rugged Robotics can demonstrate value on a manageable scale before expanding to program-wide deployment. 

### **Content Engagement Journey** {#content-engagement-journey}

Content serves different purposes at each stage of the buyer journey. The ABM program deploys specific content types designed to move accounts from awareness through consideration to decision.

There's really no way to firmly guide accounts throughout these specific stages. However, this does provide a framework for us to think about the types of content typically required to build awareness and route people to an eventual conversation with the sales team. 

**Awareness Stage Content:**

The awareness stage addresses the fundamental question: "Is there a better way?" Many construction professionals don't know robotic layout exists or assume it's experimental technology. Content at this stage must quickly establish credibility while sparking curiosity.

Case studies showing 70-80% layout time reduction provide immediate proof of value. These aren't theoretical benefits—they're documented results from recognized companies. The program features three hero case studies: a data center project that saved two weeks, a warehouse where AGV installation succeeded on the first attempt, and a multi-site deployment achieving perfect consistency across five locations. Each case study follows a problem-struggle-discovery-transformation narrative arc that mirrors the prospect's journey.

The "Rugged for Data Centers, Automated Warehouses, and Manufacturing Facilities" blog post provides category-specific education. Rather than generic benefits, these posts address segment-specific challenges. The data center post discusses cooling system alignment and raised floor precision. The warehouse post explains AGV path requirements and conveyor integration. The manufacturing post covers equipment mounting and production line layout. Each post includes actual job site photography and technical specifications that establish expertise.

Video demonstrations of robots in action on job sites provide visceral proof that this technology works in real construction environments. These aren't polished marketing videos—they're raw footage showing robots operating in dusty, chaotic construction sites. The imperfection is intentional; it proves this isn't theoretical but practical technology. Videos are kept under two minutes and focus on specific capabilities: multi-trade marking, digital verification, or speed comparisons with manual crews.

Derrick Morse's founder story humanizes the technology while establishing domain expertise. As someone who experienced layout failures firsthand, Derrick's narrative resonates with construction professionals who've faced similar frustrations. The story follows his journey from traditional surveying through technology development to successful deployments. This content works particularly well on LinkedIn, where construction leaders seek peer perspectives.

**Consideration Stage Content:**

The consideration stage addresses the critical question: "How would this work for us?" Prospects understand the value proposition but need to visualize implementation within their specific context.

The "How It Works" content series provides technical depth without overwhelming complexity. Rather than a single monolithic piece, this series breaks down the technology into digestible components. One piece explains the BIM-to-field workflow. Another details multi-trade coordination. A third covers quality verification and documentation. Each piece includes technical diagrams, process flows, and time-lapse videos. This modular approach allows prospects to explore areas most relevant to their concerns.

**Decision Stage Content:**

The decision stage answers the ultimate question: "Is this worth the risk?" Even convinced prospects need final validation before committing budget and reputation to new technology.

Deep-dive case studies provide exhaustive detail about successful deployments. These short documents include project overviews, technical specifications, problem descriptions, solution approaches, quantified results, and lessons learned. They're designed for technical teams building implementation plans and executives seeking risk mitigation strategies.  

### **Content Distribution Strategy** {#content-distribution-strategy}

Creating excellent content means nothing without effective distribution. The ABM program uses multiple channels to ensure consistent message delivery across the buying committee.

**Email Sequences:**

The five-touch email campaign serves as a channel in the ABM campaign overall. These emails are designed to entice the recipient to respond and start a conversation with the sales team. 

**LinkedIn Advertising Strategy:**

The $1,250 monthly LinkedIn budget requires targeting and creative optimization. Rather than broad awareness campaigns, the program uses LinkedIn for account penetration and retargeting.

Custom audiences built from Clay-identified contacts ensure ads reach specific buying committee members. When SmartLead launches an email campaign to target accounts, those same contacts see LinkedIn ads reinforcing the message. This coordinated approach increases message frequency without increasing email volume.

The LinkedIn ad campaigns are designed to show a variety of creatives. A blend of case studies, images, videos, and different calls to action to content on the company's website helps provide a layer of overall brand awareness. 

**Display Advertising Approach:**

AdRoll retargeting maintains brand presence after initial engagement. Website visitors see display ads for 30 days post-visit, ensuring Rugged Robotics stays top-of-mind during long consideration cycles. The program uses frequency capping (3-5 impressions daily) to maintain presence without creating fatigue. The monthly budget for Display Advertising (Adroll) is $250. 

**Website Intelligence via Factors.ai:**

Factors.ai transforms anonymous website traffic into actionable account intelligence. When someone from Dematic visits the site, even without filling out a form, the system identifies the account and tracks their content consumption. This intelligence informs outreach timing and message selection.

## **List Building & Data Enrichment** {#list-building-&-data-enrichment}

The foundation of successful ABM lies in data quality. Poor data creates poor outcomes—emails bounce, ads miss their targets, and sales teams waste time on dead ends. The Clay-powered list building and enrichment process ensures every account and contact meets strict quality standards before entering the campaign ecosystem.

### **Clay Workflow Architecture** {#clay-workflow-architecture}

Clay serves as the intelligent data layer, orchestrating multiple enrichment sources while maintaining real-time suppression against HubSpot. The workflow begins with account identification from various sources: industry databases, construction project listings, LinkedIn Sales Navigator exports, and website visitor identification from Factors.ai.

For each account, Clay performs sequential enrichment using waterfall logic. First, it queries Clearbit for company firmographics—revenue, employee count, industry classification, and technology stack. If Clearbit lacks data, Clay falls back to Apollo, then FullContact, then manual LinkedIn scraping. This waterfall approach ensures maximum data coverage while minimizing API costs.

Contact discovery follows a similar pattern. Clay identifies decision makers through multiple signals: LinkedIn titles, email patterns, press releases, and conference speaker lists. It prioritizes contacts based on title relevance and engagement signals. A VP of Operations who recently posted about construction innovation ranks higher than one with no recent activity.

### **Suppression Management System** {#suppression-management-system}

The suppression system prevents embarrassing and potentially damaging duplicate outreach. Before any contact enters SmartLead, Clay performs real-time checks against multiple exclusion lists.

**HubSpot Synchronization:** Clay maintains continuous synchronization with HubSpot, checking every contact against existing records. If someone already exists in HubSpot, Clay examines their status. Active opportunities trigger complete suppression. Closed-lost opportunities from the past 90 days receive modified messaging acknowledging previous conversations. Long-dormant contacts may re-enter campaigns with careful positioning.

**Blacklist Management:** The system maintains three suppression categories. The permanent blacklist includes competitors, existing customers, and companies that explicitly requested no contact. The temporary blacklist includes recent negative replies, out-of-office responses, and companies in active negotiation. The cooling-off list includes companies that showed interest but weren't ready, requiring different nurture strategies.

### **Data Quality Standards** {#data-quality-standards}

Every contact must meet specific criteria before entering campaigns. These standards ensure high deliverability, relevant messaging, and professional representation.

**Email Validation Requirements:**

- Valid email syntax and domain existence  
- No generic addresses (info@, support@, contact@)  
- Business domain only (no gmail.com, yahoo.com, etc.)  
- Verified deliverability through NeverBounce or similar  
- No catch-all domains without secondary validation

**Contact Completeness Criteria:**

- First and last name identified  
- Current title verified within past 6 months  
- LinkedIn profile matched and active  
- Company association confirmed  
- No recent job changes (within 30 days)

**Account Qualification Standards:**

- Revenue within target range ($500M+)  
- Industry classification matched  
- Geographic location within service areas  
- No bankruptcy or acquisition in progress  
- Active construction projects identified

## **Multi-Channel Orchestration** {#multi-channel-orchestration}

Modern B2B buyers don't follow linear paths. They bounce between channels, engage sporadically, and involve multiple stakeholders across extended timelines. Effective ABM requires sophisticated orchestration that delivers consistent messages across every touchpoint while respecting channel preferences and engagement patterns.

### **Email Sequences via SmartLead** {#email-sequences-via-smartlead}

SmartLead powers the email component of the ABM program, operating across alternative domains to ensure deliverability while maintaining sender reputation. The platform manages the delicate balance between volume and quality, gradually warming up new domains while maintaining steady-state sending rates.

**Domain Strategy and Warmup Process:**

The program operates three alternative domains: rugged-robotics.co, ruggedrobotics.co, and ruggedrobotics.io. These domains mirror the main website content but exist solely for outbound campaigns. This separation protects the primary domain's reputation while enabling aggressive outbound strategies.

New domains undergo a careful two-week warmup process. Days 1-3 see just 20 emails daily, primarily to opted-in addresses and email validators. Days 4-7 increase to 40 emails daily, introducing carefully selected high-quality prospects. Week two graduates from 40 to 80 emails daily, reaching steady-state volume by day 14\. This gradual increase, combined with consistent engagement from quality lists, establishes positive sender reputation.

**The Five-Touch Excellence Framework:**

Each email in the sequence serves a specific purpose within the broader narrative arc. The sequence adapts based on engagement—opens, clicks, and replies trigger different follow-up paths.

*Touch 1 \- Problem Recognition (Day 0):* This email focuses entirely on the prospect's pain point without mentioning Rugged Robotics. For data center builders, it might describe a project where layout delays triggered $2M in liquidated damages. For automation integrators, it might discuss AGV installations failing due to path inaccuracies. The email ends with a soft question: "Has layout precision been a challenge on your recent projects?" This approach generates responses from prospects who identify with the problem.

*Touch 2 \- Innovation Introduction (Day 4):* Non-responders receive the second touch introducing robotic layout through customer success. Rather than feature lists, this email tells a brief transformation story. "DPR Construction turned a 3-day layout into 6 hours on their latest data center" provides tangible proof without overwhelming detail. The email includes a single compelling image—robots marking a massive concrete floor—and invites prospects to learn how this applies to their projects.

*Touch 3 \- Peer Validation (Day 9):* The third touch leverages social proof from recognized industry leaders. This email might feature a quote from a VP at Turner Construction explaining why they've standardized on robotic layout. It addresses the underlying concern: "If this technology is so good, why isn't everyone using it?" The answer: leading companies are, and they're gaining competitive advantage. The CTA invites prospects to see what their competitors are doing.

*Touch 4 \- Technical Proof (Day 15):* The fourth touch provides technical substance for analytical buyers. This email includes specific metrics: ±2mm accuracy, 50,000 square feet in 6 hours, 95% reduction in rework. It might attach a technical specification sheet or link to a detailed case study. This touch often generates responses from technical influencers who need details to build internal consensus.

*Touch 5 \- Pilot Invitation (Day 22):* The final touch creates urgency through capacity constraints. "We can only support 5 pilot projects in Q2—is one of them yours?" This scarcity is real; Rugged Robotics has limited robots and crews. The email includes a direct calendar link for qualified prospects and a simple form for those needing more information. This touch often triggers responses from prospects who've been silently following along.

### **LinkedIn Advertising Architecture** {#linkedin-advertising-architecture}

LinkedIn advertising serves three critical functions: warming up cold prospects before email outreach, reinforcing messages during email sequences, and maintaining visibility during long consideration cycles. The platform's account-based targeting capabilities make it ideal for ABM, though the limited budget requires careful optimization.

**Account Targeting Strategy:**

The program uploads custom company lists directly from Clay, ensuring perfect alignment with email campaigns. When launching a campaign to 100 data center builders, those exact companies see LinkedIn ads. This coordination multiplies message impact—prospects see emails and ads delivering consistent messages.

Persona targeting within accounts ensures ads reach the right individuals. The campaign targets specific job titles (Senior Project Manager, VP of Operations, BIM Director) at targeted companies. This precision reduces waste while increasing relevance. A VP of Operations at Turner Construction sees ROI-focused messaging, while a Project Manager at the same company sees efficiency-focused content.

**Creative Testing Framework:**

The limited budget demands rapid creative optimization. The program tests one variable at a time: headline, image, or CTA. Week one might test three headlines with identical images. Week two tests the winning headline with three images. Week three tests the winning combination with three CTAs. This systematic approach identifies winning combinations within 6-8 weeks.

Current top-performing creative includes time-lapse videos of robots in action, before/after photos showing layout transformation, and customer testimonial videos. Static images work for retargeting, but video generates 3x higher engagement for cold audiences.

**Budget Allocation Model:**

The $1,250 monthly budget splits across three campaign types. Forty percent ($500) funds cold account penetration, introducing Rugged Robotics to new prospects. Forty percent ($500) supports email campaign amplification, reinforcing SmartLead sequences. Twenty percent ($250) maintains retargeting presence for engaged accounts. This allocation balances new account acquisition with existing account nurture.

### **Display Advertising via AdRoll** {#display-advertising-via-adroll}

Display advertising through AdRoll extends reach beyond LinkedIn's professional environment. When decision makers browse industry publications, news sites, or even personal interests, Rugged Robotics maintains presence. This persistent visibility proves especially valuable during extended consideration cycles.

**Retargeting Pixel Strategy:**

The Factors.ai identification pixel fires for all website visitors, capturing account-level data without personal information. When someone from Dematic visits the site, AdRoll adds that company to retargeting lists. Even if the individual doesn't convert, their colleagues see display ads, creating account-wide awareness.

Segmented retargeting delivers relevant messages based on content consumption. Visitors who view data center content see data center-focused ads. Those who download warehouse automation case studies see AGV-precision messaging. This behavioral targeting improves relevance while reducing creative requirements.

**Frequency and Reach Optimization:**

Display campaigns balance visibility with respect for user experience. Frequency caps limit impressions to 3-5 daily per user, preventing banner blindness and annoyance. The 30-day retargeting window maintains presence during typical consideration cycles without indefinite following.

## **Event Management System** {#event-management-system}

The event management system transforms raw engagement signals into actionable intelligence. Built on n8n's workflow automation platform, this system processes thousands of events daily—email opens, replies, website visits, ad clicks—and routes qualified opportunities directly to sales. The sophistication lies not in the volume of data processed but in the intelligence applied to each signal.

### **n8n Workflow Architecture** {#n8n-workflow-architecture}

n8n serves as the central nervous system, connecting disparate tools through intelligent workflows. Unlike simple integration platforms, n8n enables complex logic, conditional routing, and AI-powered decision making. The platform processes events in real-time, ensuring sales teams receive qualified leads within minutes of expression of interest.

**Webhook Processing Infrastructure:**

The system receives webhooks from multiple sources simultaneously. SmartLead sends events for every email interaction—sends, opens, clicks, replies, bounces, and unsubscribes. Factors.ai transmits website visitor identification and behavior data. LinkedIn Campaign Manager (via API polling) provides ad engagement metrics. Each webhook triggers specific workflows based on event type and account status.

SmartLead reply webhooks receive special attention. When a prospect replies, n8n immediately extracts the message content, sender information, and conversation history. This data feeds into the AI classification engine, determining next steps within seconds. Positive replies route to sales, negative replies update suppression lists, and neutral replies queue for manual review.

### **AI Reply Classification Logic** {#ai-reply-classification-logic}

The AI classification system uses GPT-5 to understand reply intent. Rather than simple keyword matching, the system understands context, tone, and nuance. This sophistication eliminates hours of manual reply sorting while ensuring no qualified lead goes unnoticed.

**Classification Prompt Template:**

```
You are analyzing email replies to outbound campaigns for Rugged Robotics, a construction robotics company. Classify the following reply into exactly one category:

INTERESTED: Any positive interest in the technology, request for information, questions about capabilities, willingness to meet, or forward to colleagues. Include tentative interest like "might be interesting" or "worth exploring."

UNSUBSCRIBE: Explicit requests to stop emails, be removed from lists, or cease contact. Include hostile responses that indicate strong disinterest.

OUT_OF_OFFICE: Automatic out-of-office replies, vacation messages, or leave notices. Include messages about extended absence or sabbatical.

NOT_RELEVANT: Polite declinations, not a fit responses, wrong person/department, or timing issues without future interest. Include "not interested" without hostility.

Reply to analyze:
[REPLY_CONTENT]

Respond with only the category name.
```

This prompt achieves 94% accuracy in testing, with most errors being conservative (classifying interest as not\_relevant rather than missing opportunities). The system logs all classifications for periodic human review, continuously improving accuracy.

### **Sales Handoff Process** {#sales-handoff-process}

Qualified leads require immediate attention. The handoff process ensures sales teams have complete context while prospects have seamless experiences.

**Immediate Notification Protocol:**

When the AI classifies a reply as interested, n8n triggers multiple actions simultaneously. First, it forwards the complete email thread to the designated sales representative or a “catch all” email address. The forwarded email includes account intelligence from Clay—company size, recent news, technology stack—providing instant context.

Second, it sends a Slack notification to the sales channel with key details: company name, contact name, title, and reply excerpt. This redundant notification ensures immediate awareness even if email is delayed. The Slack message includes direct links to the HubSpot record and LinkedIn profile, enabling instant research.

Third, it creates or updates the HubSpot contact record with engagement history. Every email sent, opened, and clicked gets logged. The AI classification and reply content are added as notes. This historical context helps sales representatives understand the prospect's journey before making contact.

**SLA Management Framework:**

Response time matters. The system tracks SLA compliance for every qualified lead. Interested replies require response within 4 business hours. After 2 hours, the system sends reminder notifications. After 4 hours, it escalates to sales management. This accountability ensures no opportunity goes cold due to delayed follow-up.

### **Event Taxonomy** {#event-taxonomy}

The system tracks 10 distinct event types, each providing unique intelligence about account engagement and buying readiness.

**Email Events:**

- `email_campaign_started`: Campaign deployed to contact  
- `email_campaign_completed`: Email sequence terminated (either after all emails have gone out or if there is a reply or unsubscribe)  
- `email_replied`: Response received  
- `email_unsubscribed`: Opt-out requested

**Web Events:**

- `web_visit`: Account identified on website  
- `web_form_submit`: Conversion action taken  
- `content_download`: Resource accessed

**Ad Events:**

- `ad_impression`: LinkedIn ad viewed  
- `ad_click`: LinkedIn ad engaged

Each event includes metadata: timestamp, account\_id, campaign\_id, and event\_details. This granular tracking enables sophisticated attribution modeling and engagement scoring.

## **Data Management & Integration** {#data-management-&-integration}

The data architecture represents the program's most innovative element. By completely separating account-level intelligence from personal information, the system achieves comprehensive tracking while maintaining privacy compliance. This separation isn't just about regulation—it's about building sustainable, scalable ABM infrastructure.

### **Supabase Schema Design** {#supabase-schema-design}

Supabase stores all account-level events in a carefully designed schema optimized for both real-time processing and historical analysis. The database uses PostgreSQL's advanced features—JSON columns for flexible metadata, indexes for rapid querying, and triggers for real-time notifications.

**Core Tables Structure:**

```sql
-- Accounts table: Master record for each target company
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    industry_segment VARCHAR(50),
    revenue_range VARCHAR(50),
    employee_range VARCHAR(50),
    tier INTEGER CHECK (tier BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account events table: All engagement signals
CREATE TABLE account_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(account_id),
    event_type VARCHAR(50) NOT NULL,
    event_source VARCHAR(50) NOT NULL,
    event_metadata JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement scores table: Calculated account engagement
CREATE TABLE engagement_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(account_id),
    score_type VARCHAR(50) NOT NULL,
    score_value DECIMAL(5,2),
    components JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, score_type)
);

-- Create indexes for performance
CREATE INDEX idx_account_events_account_id ON account_events(account_id);
CREATE INDEX idx_account_events_occurred_at ON account_events(occurred_at);
CREATE INDEX idx_account_events_type ON account_events(event_type);
```

This schema enables complex queries while maintaining performance. Finding all accounts that visited the website but haven't received emails takes milliseconds even with millions of events.

### **Data Flow Orchestration** {#data-flow-orchestration}

Data flows through the system in carefully orchestrated streams, each maintaining isolation while enabling coordination.

**Ingestion Pipeline:**

Events enter Supabase through n8n workflows that validate, transform, and enrich data before storage. When Factors.ai identifies a website visitor, n8n receives the webhook, extracts the company domain, matches it against the accounts table, and creates an event record with complete metadata. This processing happens in under 500ms, enabling real-time alerting for high-value accounts.

**Privacy-Preserving Aggregation:**

The system aggregates personal actions into account-level intelligence without storing personal data. When three people from Dematic open an email, Supabase records three email\_opened events for Dematic without identifying individuals. This aggregation provides valuable intelligence—Dematic shows increasing engagement—without privacy risks.

### **System Integration Patterns** {#system-integration-patterns}

Each system integration follows specific patterns designed to maintain data isolation while enabling functional coordination.

**HubSpot Integration Pattern:**

HubSpot remains the system of record for contact information but never receives account-level event data. When sales needs contact details, they work directly in HubSpot. When marketing needs engagement intelligence, they query Supabase (via reports produced in Databox). This separation prevents accidental personal data exposure while maintaining operational efficiency.

Clay acts as the bridge, performing real-time lookups against HubSpot for suppression while never synchronizing account events back. This one-way validation maintains data hygiene without creating privacy risks.

**Factors.ai Data Pipeline:**

Factors.ai provides critical website intelligence but only transmits company-level data to the ABM system. When configured properly, Factors identifies accounts without capturing individual user behavior. This configuration requires careful setup but enables powerful account-based tracking without cookies or personal identification.

## **ABM Program Management** {#abm-program-management}

Successful ABM requires consistent execution across multiple channels, continuous optimization based on performance data, and rapid response to market signals. The program management framework ensures nothing falls through the cracks while maintaining agility to capitalize on opportunities.

### **Weekly Optimization Cadence** {#weekly-optimization-cadence}

The ABM program requires consistent weekly optimization to maintain performance and identify opportunities. Rather than daily tactical work, the team focuses on comprehensive weekly review and adjustment cycles that ensure all systems operate smoothly while surfacing actionable insights for strategic decision-making. 

**Weekly Optimization Process:** 

Each week, the team conducts a thorough multi-channel performance evaluation examining email metrics, LinkedIn ad performance, website engagement, and reply quality. This comprehensive review identifies trends across channels—are email open rates maintaining above 25%? Is LinkedIn generating clicks at acceptable CPCs? Are the right accounts visiting the website? This analysis reveals which channels deserve more investment and which need refinement. 

Data flow validation ensures technical infrastructure remains healthy. The team confirms SmartLead webhooks are firing correctly, Factors.ai is identifying website visitors, n8n workflows are processing events, and Supabase is capturing all engagement signals. Any data gaps or technical issues get flagged for immediate resolution. This proactive monitoring prevents small issues from becoming campaign-stopping problems. 

Account activity analysis identifies hot prospects requiring immediate attention. By examining engagement scores in Supabase, the team spots accounts showing buying signals across multiple channels—perhaps Dematic opened three emails, visited the website twice, and clicked LinkedIn ads. These engaged accounts get flagged for sales outreach or accelerated nurture sequences. This intelligence ensures no opportunity goes unnoticed. 

**Weekly Client Meeting Agenda:** 

The optimization findings feed directly into structured client meetings that drive strategic decisions:

* **Performance Snapshot:** Quick review of key metrics against targets   
* **Channel Insights:** What's working, what needs adjustment, and recommended changes   
* **Hot Accounts:** List of 5-10 accounts showing high engagement requiring sales attention   
* **Technical Health:** Confirmation that all systems are operational with any issues noted   
* **Next Week Focus:** Specific campaigns launching and optimization priorities   
* **Strategic Questions:** Bigger picture items requiring client input or approval

This weekly rhythm maintains program momentum while providing regular opportunities for course correction based on data and market feedback.

### **Reply Management SLAs** {#reply-management-slas}

Reply management can make or break ABM success. Prospects who express interest expect rapid, relevant responses. The SLA framework ensures consistent, quality engagement regardless of volume.

**Response Time Requirements:**

- Interested replies: 4 hours during business hours  
- Information requests: 8 hours during business hours  
- Objections or concerns: 24 hours  
- Unsubscribe requests: Immediate processing  
- Out of office: No response required

**Quality Standards:**

Every response must be personalized, referencing the prospect's specific context. Generic "thanks for your interest" messages destroy the relationship that email sequences carefully built. Sales representatives receive templates but must customize them based on the prospect's industry, role, and expressed needs.

Responses must advance the conversation without being pushy. If a prospect asks about accuracy specifications, provide technical details and offer to discuss their specific requirements. If they mention budget concerns, share ROI case studies and suggest starting with a pilot. Each response should provide value while creating a natural next step.

### **Adjustment and Refinement Strategies** {#adjustment-and-refinement-strategies}

Markets change, competitors evolve, and buyer preferences shift. The ABM program must adapt continuously without losing strategic focus. The adjustment framework provides structured evolution without chaotic pivoting.

**Monthly Strategy Reviews:**

Monthly reviews examine strategic effectiveness beyond tactical metrics. Are we reaching the right accounts? Are our messages resonating? Are competitors changing their approach? These reviews might result in segment adjustments, message refinements, or channel reallocation. For example, if warehouse automation shows higher engagement than data centers, the program might shift resources accordingly.

**Quarterly Program Audits:**

Quarterly audits provide deep examination of program health. Every component gets scrutinized: data quality, technical infrastructure, content effectiveness, and sales alignment. External perspectives—from customers, partners, or consultants—provide valuable feedback. These audits often identify breakthrough opportunities or hidden problems that daily execution obscures.

**Trigger-Based Adaptations:**

Certain events trigger immediate program adjustments. A major competitor announcement might require message updates. A viral LinkedIn post might create content opportunities. A technology failure might demand infrastructure changes. The program maintains agility to respond to these triggers without disrupting core operations.

## **Performance Measurement** {#performance-measurement}

Measuring ABM success requires sophisticated attribution modeling that connects long-term revenue impact with short-term engagement signals. The measurement framework provides visibility into program health while identifying optimization opportunities.

### **KPI Framework** {#kpi-framework}

The program tracks three categories of metrics, each providing different insights into performance and health.

**Leading Indicators (Weekly Tracking):**

Leading indicators predict future success. These metrics provide early warning signals and immediate optimization opportunities:

- **Account Reach Rate**: Percentage of target accounts reached monthly (Target: 20%)  
- **Multi-Channel Engagement**: Accounts engaging across 2+ channels (Target: 30%)  
- **Email Reply Rate**: Percentage of emails generating replies (Target: .5 \- 1%)  
- **Website Identification Rate**: Percentage of web visitors identified (Target: 25%)  
- **LinkedIn Ad CTR**: Click-through rate on account-targeted ads (Target: 0.8%)

### **Attribution Modeling** {#attribution-modeling}

Attribution in B2B ABM is notoriously complex. Buyers engage across multiple channels over extended periods. The attribution model provides visibility into what's working without getting paralyzed by perfect measurement.

### **Reporting Dashboard Architecture** {#reporting-dashboard-architecture}

Databox consolidates data from all systems into unified dashboards that provide real-time visibility without overwhelming detail.

**Executive Dashboard:**

The executive view focuses on business impact: pipeline generated, pilot projects initiated, and ROI. Trend lines show momentum. Heat maps identify hot accounts. Funnel visualizations reveal conversion bottlenecks. This dashboard answers the critical question: "Is ABM working?"

**Operations Dashboard:**

The operations view monitors execution health: email performance, ad efficiency, and content engagement. Real-time alerts flag issues like declining open rates or rising CPCs. This dashboard enables rapid optimization and issue resolution.

[image1]: <data:image/png;base64,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>
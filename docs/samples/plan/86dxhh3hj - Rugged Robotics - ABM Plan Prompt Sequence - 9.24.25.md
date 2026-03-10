# Master Prompt for Complete ABM Program Details Document

Your job is to create a comprehensive ABM Program Details document for Rugged Robotics' Account-Based Marketing implementation. This should be a professional consulting document that provides detailed technical and strategic guidance for executing their ABM program.

\#\#\# DOCUMENT REQUIREMENTS:  
\- Length: Approximately 6,000 \- 8,000 words  
\- Format: Professional consulting document with balanced formatting  
\- Style: Mix narrative paragraphs (2-4 sentences) with strategic bullet points and visual breaks; this document must be an “easy read” that is equally effective for a detailed marketing director and an executive  
\- Tone: Professional but readable, avoiding both dense academic writing and oversimplified content

\#\#\# PROGRAM CONTEXT:  
Rugged Robotics provides robotic layout solutions for construction and industrial automation. Their ABM program targets enterprises where layout delays cost $150K-$1M per day. The program uses sophisticated multi-channel orchestration with AI-powered automation to identify and convert high-value accounts.

\#\#\# TECHNICAL ARCHITECTURE:  
\- Account-level event tracking (no personally identifiable information) tracked in Supabase database  
\- HubSpot for contact/person-level event storage (completely separate, no sync with Supabase)  
\- SmartLead for email orchestration on alternative domains  
\- Clay for list building and suppression management (syncs automatically with Hubspot to detect if an account already exists in the company’s database)  
\- Factors.ai for website visitor identification and LinkedIn ad tracking  
\- n8n for workflow orchestration and AI-powered email reply management (replies from campaigns executed out of Smartlead)  
\- Databox for reporting dashboards to consolidate data from Hubspot and Supabase

\#\#\#\# TECHNICAL ARCHITECTURE DETAILS:  
To get further into the weeds, the architecture can be described as these functional layers:

\#\#\#\#\# Layer 1: Marketing Activities (Engagement Layer)  
\*\*This is where prospect interaction happens:\*\*  
\- \*\*Clay\*\*: List building, enrichment, suppression management  
\- \*\*SmartLead\*\*: Email orchestration and reply management    
\- \*\*LinkedIn/AdRoll\*\*: Paid advertising campaigns  
\- \*\*Factors.ai\*\*: Website visitor identification and intent tracking

\#\#\#\#\# Layer 2: Event Management (Intelligence Layer)  
\*\*This is where signals get processed:\*\*  
\- \*\*n8n\*\*: Central orchestration hub that processes ALL events  
  \- Receives webhooks from SmartLead (replies, bounces)  
  \- Receives webhooks from Factors (website visits, ad interactions)  
  \- Applies AI classification to replies  
  \- Routes qualified leads to sales  
  \- Filters and normalizes all events

\- \*\*Factors.ai\*\*: Critical component that identifies:  
  \- Which companies visit your website  
  \- LinkedIn ad engagement at account level  
  \- Cross-channel account journeys  
  \- Intent signals based on page views and content consumption

\#\#\#\#\# Layer 3: Data Management (Storage & Reporting Layer)  
\*\*This is where data lives:\*\*  
\- \*\*Supabase\*\*: Account-level event storage for reporting  
\- \*\*HubSpot\*\*: Contact records and CRM data (isolated)  
\- \*\*Databox\*\*: Reporting and visualization

The architecture has three functional purposes:

\*\*1. Engagement Orchestration\*\*  
Where you actually touch prospects through multiple channels \- email via SmartLead, ads via LinkedIn/AdRoll, and tracking via Factors.ai

\*\*2. Signal Processing & Routing\*\*  
Where n8n acts as the brain, taking signals from all sources (especially Factors for intent data), applying business logic, and routing information to the right places such as Supabase account-level event tracking and directly into Hubspot when appropriate at the contact-level

\*\*3. Data Storage & Intelligence\*\*  
Where cleaned, account-level data lives in Supabase for reporting, while contact details stay isolated in HubSpot

Factors.ai is particularly critical because it's the ONLY way you know:  
\- Which accounts are actually visiting your website  
\- Whether your LinkedIn ads are reaching target accounts  
\- When an account shows buying intent through multi-channel engagement

\#\#\# KEY FEATURES:  
\- AI classification of email replies (interested/unsubscribe/OOO/not relevant)  
\- Automatic notifications of positive replies replies via Slack and email  
\- Business domain filtering (exclude personal emails from account tracking)  
\- Suppression (dynamic HubSpot checks in Clay before launching Smartlead campaigns)  
\- All accounts added to the Smart Lead campaign get added to a custom audience in LinkedIn and Adroll.   
\- Account-level scoring based on multi-channel engagement (handled by reporting on event data stored in Supabase)

\#\#\# TARGET AUDIENCE:  
1\. Construction Segment: Data center and mission-critical facility builders ($500M-$100B+ revenue)  
2\. Industrial Automation: Warehouse automation systems integrators ($500M-$5B revenue)  
\- 1,000 accounts per segment initially  
\- 3-5 decision makers per account  
\- Focus on Senior Program Managers, VPs of Operations, Engineering Directors

\#\#\# PROBLEM STATEMENT & SOLUTION:  
Rugged Robotics addresses two critical failures in current construction layout methods:

1\. Cost of Delays: Layout errors cause cascading delays costing $150K-$1M per day in lost revenue  
2\. Precision Gap: Traditional methods using chalk lines and spray paint deliver ±1/4" accuracy at best, while modern automated systems require ±2mm precision

\#\#\#\# TECHNICAL DIFFERENTIATORS:  
Traditional Layout Methods (Current State):  
\- Chalk lines and spray paint that fade, smudge, or disappear  
\- Manual measurement prone to human error and fatigue  
\- 1/4 inch tolerance that compounds across large facilities  
\- Sequential layout requiring multiple crew visits  
\- No digital verification or quality control  
\- 2-3 days for a 50,000 sq ft warehouse

Rugged Robotics Solution:  
\- Robotic precision delivering ±2mm accuracy consistently  
\- All trades marked in a single pass (MEP, walls, equipment)  
\- Digital verification with as-built documentation  
\- 10x faster than manual crews (5-6 hours for 50,000 sq ft)  
\- Multi-color coding for different trades  
\- Works 24/7 without fatigue or accuracy degradation  
\- Direct integration with BIM/CAD models

\#\#\#\# IMPACT METRICS TO EMPHASIZE:  
\- Eliminates 95% of layout-related rework  
\- Reduces layout time by 70-80%  
\- Enables 2-4 week earlier facility opening  
\- Supports millimeter-precision requirements for AGVs and robotic systems  
\- Allows simultaneous multi-site deployment without quality variance

\#\#\# Offer Strategy & Content Framework

The ABM program centers around brand awareness and there’s really no core “irresistable” offer right now other than “Take Rugged for a spin with a pilot project.” 

\*\*Offer 1: Start with a pilot project\*\*  
\- Format: Form   
\- Input: Provide details in the form such as company information and describe your ideal pilot (location, estimated floor area, layout scope, timeline)  
\- Output: Thank you confirmation and a reply from sales in a short time  
\- CTA: "Start with a pilot project"  
\- Value Prop: Helps expedite layout and avoid hidden delay costs before breaking ground

\#\#\# Content Engagement Journey

\*\*Awareness Stage Content:\*\*  
\- Case studies showing 70-80% layout time reduction  
\- Blog posts: "Rugged for Data Centers, Automated Warehouses, and Manufacturing Facilities"  
\- Video demos of robots in action on job sites  
\- Derrick Morse’s story on founding Rugged Robotics

\*\*Consideration Stage Content:\*\*  
\- How It Works

\*\*Decision Stage Content:\*\*  
\- Case studies showing 70-80% layout time reduction

\#\#\# Content Distribution Strategy

\*\*Email Sequences:\*\* 5-touch campaign promoting relevant offer based on segment  
\*\*LinkedIn Ads:\*\* Direct to offer landing pages or brand awareness content   
\*\*Website Retargeting:\*\* Show offer to identified visitors via Factors

\#\#\# Conversion Paths (Where are we sending people once they see the offer?)

1\. \*\*Landing Page\*\* (Hosted on company domain)  
   \- Problem-focused headline  
   \- Short text description of value  
   \- Simple form (Company, Email, 1-2 qualifying questions)  
   \- Social proof (logos or stats or case study)

\#\#\# Messaging Framework

\*\*Primary Value Proposition:\*\*  
"Turn 3-day manual layouts into 6-hour robotic precision"

\*\*Supporting Messages by Persona:\*\*

\*For Construction Program Managers:\*  
\- "Deploy across 5 sites simultaneously without quality variance"  
\- "Eliminate layout as a critical path risk"  
\- "Scale without scaling headcount"

\*For Operations VPs:\*  
\- "Open facilities 2-4 weeks earlier"  
\- "Achieve zero rework from layout errors"  
\- "Enable true automation with ±2mm precision"

\*For Engineering Directors:\*  
\- "Direct BIM-to-field with digital verification"  
\- "Multi-trade coordination in single pass"  
\- "As-built documentation included"

\#\#\# CONTENT TO INCLUDE:

1\. Executive Summary  
\- Target audience  
\- Problem statement (cost of delays)  
\- Solution overview  
\- Goals of the ABM campaign  
\- Key benefits of using ABM to reach this audience

2\. Program Architecture Overview  
\- System design philosophy (account-level tracking)  
\- Description of the three-layer separation model

3\. Target Audience Definition  
\- Market segmentation rationale  
\- Detailed ICPs for each segment  
\- Buyer personas with pain points (what is the problem we’re solving?)  
\- Account prioritization framework

4\. Offer Strategy & Content Framework  
\- Offer concepts  
	\- Each offer concept should be documented like so:   
		\*\*Offer 1: Facility Delay Risk Scorecard\*\*   
\- Format: Interactive calculator with PDF output   
\- Input: Project type, size, timeline   
\- Output: Days at risk, cost impact ($150K-$1M per day)   
\- CTA: "Get your risk scorecard"   
\- Value Prop: Quantifies hidden delay costs before breaking ground  
\- Additional types of content shared with this audience to build more awareness around the product (this is layered in on top of the core offer)  
\- Desired action or outcome

4\. List Building & Data Enrichment  
\- Clay workflow for identification and enrichment  
\- Suppression management (blacklists \+ HubSpot sync)  
\- Data quality standards  
\- Compliance filtering

5\. Multi-Channel Orchestration  
\- Email sequences via SmartLead (5-touch email campaign examples)  
\- LinkedIn advertising strategy ($1,500/month budget)  
\- Display advertising approach (retargeting through Adroll)  
\- Website intelligence via Factors.ai

6\. Event Management System  
\- n8n workflow descriptions  
\- AI reply classification logic  
\- Sales handoff process (email replies forwarded to specific people and notifications sent in Slack)  
\- Event taxonomy (8-10 tracked events)

7\. Data Management & Integration  
\- Supabase schema for account\_events  
\- Data flow diagrams  
\- System separation rationale

8\. ABM Program Management  
\- Weekly optimization tasks  
\- Reply management SLAs  
\- Adjustment/refinement strategies

9\. Performance Measurement  
\- KPI framework (leading and lagging indicators)  
\- Attribution model  
\- Reporting dashboard structure  
\- Success metrics

SPECIFIC DETAILS TO INCORPORATE:  
\- Email warmup: 2 weeks, graduating from 20 to 80 emails/day  
\- Sending limits: 60-80 emails/day per mailbox at steady state  
\- Reply classification categories: interested, unsubscribe, out\_of\_office, not\_relevant  
\- LinkedIn budget: $1,250/month   
\- Scoring thresholds: Defined after we get some data  
\- Alternative domains: rugged-robotics.co, ruggedrobotics.co, ruggedrobotics.io  
\- Volume targets: 2,000-3,000 emails/week, 50,000 LinkedIn impressions/month

FORMATTING GUIDELINES:  
\- Start each major section with 1-2 paragraphs of context  
\- Use bullet points for lists longer than 3 items  
\- Include code blocks for technical specifications  
\- Add tables for structured data (KPIs, SLAs, etc.)  
\- Insert visual breaks between subsections  
\- Keep paragraphs short and scannable  
\- Bold key terms and important metrics

KEY REFERENCE MATERIALS:  
\- Review the Marketing Roadmap for background information on the company, clients, etc. This is attached to this project as a PDF.  
\- Review the transcripts of conversations we had with the client to get more context 

SECTIONS TO EXPAND WITH DETAIL:  
\- Email sequence copy (5 emails with subject lines and CTAs)  
\- AI classification prompt template  
\- Sales handoff email template  
\- Supabase database schema  
\- Campaign launch checklist

Please write this as a complete, implementation-ready document that a team could use to build and execute this ABM program from scratch.  

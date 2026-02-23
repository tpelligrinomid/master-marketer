import { CompetitiveDigestInput } from "../types/competitive-digest-input";
import { CompetitiveDigestResearch } from "../lib/exa";

const SYSTEM_PROMPT = `You are an expert competitive intelligence analyst specializing in B2B marketing. You synthesize raw web research into structured, actionable competitive intelligence digests.

You always return your response as a JSON object. Never include text outside the JSON.`;

export function buildCompetitiveDigestPrompt(
  input: CompetitiveDigestInput,
  research: CompetitiveDigestResearch,
  period: { start: string; end: string }
): { system: string; user: string } {
  const userParts: string[] = [];

  userParts.push(`## Client
- **Company:** ${input.client.company_name}
- **Domain:** ${input.client.domain}
- **Industry:** ${input.client.industry}

## Analysis Period
- **Start:** ${period.start}
- **End:** ${period.end}

## Competitors to Analyze
${input.competitors.map((c) => `- **${c.name}** (${c.domain})`).join("\n")}`);

  // Raw research results by competitor
  userParts.push("\n---\n\n## Raw Research Results\n");

  for (const competitor of input.competitors) {
    const results = research.byCompetitor[competitor.name] || [];
    userParts.push(`\n### ${competitor.name} (${results.length} results)\n`);
    if (results.length === 0) {
      userParts.push("*No recent content found in the lookback period.*\n");
    } else {
      for (const result of results) {
        userParts.push(`#### ${result.title}`);
        userParts.push(`- **URL:** ${result.url}`);
        if (result.publishedDate) {
          userParts.push(`- **Published:** ${result.publishedDate}`);
        }
        userParts.push(`- **Content:** ${result.content}\n`);
      }
    }
  }

  // Industry results
  if (research.industry.length > 0) {
    userParts.push("\n---\n\n### Industry News & Trends\n");
    for (const result of research.industry) {
      userParts.push(`#### ${result.title}`);
      userParts.push(`- **URL:** ${result.url}`);
      if (result.publishedDate) {
        userParts.push(`- **Published:** ${result.publishedDate}`);
      }
      userParts.push(`- **Topic:** ${result.query}`);
      userParts.push(`- **Content:** ${result.content}\n`);
    }
  }

  // Output format
  userParts.push(`\n---\n\n## Your Task

Synthesize the raw research above into a structured competitive intelligence digest. For each competitor:
1. Identify genuinely new content they've published
2. Note any strategic shifts, new themes, or notable changes
3. Assess what's working for them (based on content type, topics, frequency)

For industry trends:
1. Identify the most significant trends and developments
2. Link them back to competitive implications

For content opportunities:
1. Identify gaps competitors haven't covered
2. Spot trending topics the client should address
3. Find counter-narrative opportunities from competitor hot takes
4. Rate urgency (high, medium, low)

## Output Format

Return a JSON object with this structure:

\`\`\`json
{
  "title": "Competitive Intelligence Digest — Week of [date]",
  "content_body": "Full markdown digest with sections for Competitor Activity, Industry Trends, and Content Opportunities",
  "content_structured": {
    "competitors": [
      {
        "name": "Competitor Name",
        "new_content": [
          {
            "title": "Article title",
            "url": "https://...",
            "type": "blog_post | youtube_video | social_post | news",
            "published_date": "YYYY-MM-DD",
            "summary": "2-3 sentence summary of the content and its angle",
            "engagement": {}
          }
        ],
        "notable_changes": ["Strategic observation about this competitor"]
      }
    ],
    "industry_trends": [
      {
        "topic": "Trend name",
        "summary": "What's happening and why it matters",
        "sources": [{ "title": "Source title", "url": "https://..." }]
      }
    ],
    "content_opportunities": [
      {
        "opportunity": "Clear description of the opportunity",
        "reasoning": "Why this is valuable and timely",
        "suggested_content_type": "blog_post | video_script | newsletter | social_media",
        "suggested_category": "thought_leadership | how_to | industry_analysis | counter_narrative",
        "urgency": "high | medium | low"
      }
    ]
  }
}
\`\`\`

Important:
- \`content_body\` should be a complete, readable markdown digest suitable for display in a dashboard
- Only include content that appears genuinely new — filter out old or irrelevant results
- Content opportunities should be specific and actionable, not generic
- Return ONLY the JSON object, no additional text`);

  return { system: SYSTEM_PROMPT, user: userParts.join("\n") };
}

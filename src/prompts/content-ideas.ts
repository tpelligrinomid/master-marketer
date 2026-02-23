import { ContentIdeasInput } from "../types/content-ideas-input";

const SYSTEM_PROMPT = `You are an expert content strategist specializing in B2B marketing. Your role is to generate creative, strategic, and actionable content ideas based on client context, competitive intelligence, and content strategy goals.

You always return your response as a JSON object. Never include text outside the JSON.`;

export function buildContentIdeasPrompt(input: ContentIdeasInput): {
  system: string;
  user: string;
} {
  const userParts: string[] = [];

  userParts.push(`## Client
- **Company:** ${input.client.company_name}
- **Domain:** ${input.client.domain}
- **Industry:** ${input.client.industry}${input.client.brand_voice ? `\n- **Brand Voice:** ${input.client.brand_voice}` : ""}`);

  userParts.push(`\n## Request\n\n${input.prompt}`);
  userParts.push(`\nGenerate exactly **${input.count}** content ideas.`);

  if (input.content_type) {
    userParts.push(`\nFilter: Ideas should be for content type **${input.content_type}**.`);
  }
  if (input.category) {
    userParts.push(`Filter: Ideas should target category **${input.category}**.`);
  }

  // Library content — differentiate source types
  if (input.context?.library_content?.length) {
    const clientContent = input.context.library_content.filter(
      (c) => c.source_type === "content"
    );
    const competitiveIntel = input.context.library_content.filter(
      (c) => c.source_type === "competitive_intel"
    );
    const otherContent = input.context.library_content.filter(
      (c) => c.source_type !== "content" && c.source_type !== "competitive_intel"
    );

    if (clientContent.length) {
      userParts.push("\n---\n\n## Client's Existing Content\n\nUse these for inspiration, tone consistency, and to avoid duplication:\n");
      for (const item of clientContent) {
        userParts.push(`### ${item.title}\n\n${item.content}`);
      }
    }

    if (competitiveIntel.length) {
      userParts.push("\n---\n\n## Competitive Intelligence\n\nUse these for gap analysis and competitive positioning. Do NOT replicate competitor content — find opportunities they've missed:\n");
      for (const item of competitiveIntel) {
        userParts.push(`### ${item.title}\n\n${item.content}`);
      }
    }

    if (otherContent.length) {
      userParts.push("\n---\n\n## Additional Context\n");
      for (const item of otherContent) {
        userParts.push(`### ${item.title} (${item.source_type})\n\n${item.content}`);
      }
    }
  }

  // Content plan
  if (input.context?.content_plan) {
    userParts.push(`\n---\n\n## Content Plan\n\nAlign ideas with this strategic plan:\n\n${input.context.content_plan}`);
  }

  // Existing ideas to avoid
  if (input.context?.existing_ideas?.length) {
    userParts.push(`\n---\n\n## Existing Ideas (Avoid Duplicates)\n\nDo NOT suggest ideas similar to these:\n\n${input.context.existing_ideas.map((idea) => `- ${idea}`).join("\n")}`);
  }

  // Output format
  userParts.push(`\n---\n\n## Output Format

Return a JSON object with this structure:

\`\`\`json
{
  "ideas": [
    {
      "title": "Compelling, specific title",
      "description": "2-3 sentence description of the content piece and its angle",
      "content_type": "${input.content_type || "blog_post, newsletter, video_script, social_media, case_study, etc."}",
      "category": "${input.category || "thought_leadership, how_to, customer_stories, industry_analysis, etc."}",
      "tags": ["tag1", "tag2", "tag3"],
      "priority_suggestion": 4,
      "reasoning": "Why this idea is valuable — what gap it fills, strategic alignment, competitive opportunity"
    }
  ]
}
\`\`\`

Important:
- Each idea must have a clear, unique angle — no generic topics
- \`priority_suggestion\` is 1-5 (5 = highest priority)
- \`reasoning\` should explain competitive advantage, strategic fit, or audience need
- Return ONLY the JSON object, no additional text`);

  return { system: SYSTEM_PROMPT, user: userParts.join("\n") };
}

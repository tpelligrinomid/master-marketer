import { ContentPieceInput } from "../types/content-piece-input";

export function buildContentPiecePrompt(input: ContentPieceInput): {
  system: string;
  user: string;
} {
  const system = input.template.system_prompt;

  const includeMeta = input.output_format?.include_meta_description ?? true;
  const includeSocial = input.output_format?.include_social_snippets ?? true;
  const wordTarget = input.output_format?.word_count_target;

  const userParts: string[] = [];

  // Main user prompt (already resolved by MiD)
  userParts.push(input.template.user_prompt);

  // Reference content (manually selected by strategist)
  if (input.context?.reference_content?.length) {
    userParts.push("\n\n---\n\n## Reference Content\n\nUse the following reference materials to inform your writing. Draw on their insights and data where relevant:\n");
    for (const ref of input.context.reference_content) {
      userParts.push(`### ${ref.title} (${ref.content_type})\n\n${ref.content}`);
    }
  }

  // Library context (auto-retrieved via RAG)
  if (input.context?.library_context?.length) {
    userParts.push("\n\n---\n\n## Relevant Content from Library\n\nThese are relevant excerpts from the client's content library. Use them for tone, style, and factual consistency:\n");
    for (const lib of input.context.library_context) {
      userParts.push(`### ${lib.title} (${lib.source_type})\n\n${lib.content}`);
    }
  }

  // Additional instructions
  if (input.context?.additional_instructions) {
    userParts.push(`\n\n---\n\n## Additional Instructions\n\n${input.context.additional_instructions}`);
  }

  // Output format instructions
  userParts.push(`\n\n---\n\n## Output Format

Return your response as a JSON object with the following structure:

\`\`\`json
{
  "content_body": "The full content in markdown format",
  "content_structured": {
    "title": "The content title",${includeMeta ? '\n    "meta_description": "A compelling meta description (150-160 chars)",' : ""}${includeSocial ? '\n    "social_snippets": {\n      "linkedin": "A LinkedIn-optimized teaser (1-2 sentences)",\n      "twitter": "A Twitter-optimized teaser (under 280 chars)"\n    },' : ""}
    "sections": [
      { "heading": "Section heading", "content": "Section content in markdown" }
    ],
    "word_count": 1500,
    "tags_suggested": ["tag1", "tag2", "tag3"]
  }
}
\`\`\`

Important:
- \`content_body\` should be the complete, publication-ready content in markdown
- \`sections\` should break the content into its logical sections
- \`word_count\` should be the actual word count of content_body${wordTarget ? `\n- Target approximately ${wordTarget} words` : ""}
- Return ONLY the JSON object, no additional text`);

  return { system, user: userParts.join("\n") };
}

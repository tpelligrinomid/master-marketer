/**
 * Extract JSON from Claude's response text.
 * Handles both raw JSON and markdown code-block-wrapped JSON.
 */
export function extractJson(text: string): unknown {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

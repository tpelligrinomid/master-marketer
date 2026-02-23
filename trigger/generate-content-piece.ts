import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { ContentPieceInput, ContentPieceInputSchema } from "../src/types/content-piece-input";
import type { ContentPieceOutput } from "../src/types/content-piece-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { buildContentPiecePrompt } from "../src/prompts/content-piece";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 16000;

export const generateContentPiece = task({
  id: "generate-content-piece",
  maxDuration: 600, // 10 minutes
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: ContentPieceInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<ContentPieceOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    const input = ContentPieceInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Build prompt
    metadata.set("phase", "generation");
    metadata.set("progress", `Generating ${input.content_type} content...`);

    const { system, user } = buildContentPiecePrompt(input);

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });

    const response = await stream.finalMessage();

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON output
    metadata.set("phase", "parsing");
    metadata.set("progress", "Parsing generated content...");

    const parsed = extractJson(textContent.text) as {
      content_body: string;
      content_structured: ContentPieceOutput["content_structured"];
    };

    const output: ContentPieceOutput = {
      content_body: parsed.content_body,
      content_structured: parsed.content_structured,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        content_type: input.content_type,
      },
    };

    // Callback delivery
    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(
        _callback,
        _jobId || "unknown",
        "completed",
        output
      );
    }

    metadata.set("progress", "Complete");
    return output;
  },
});

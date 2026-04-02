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

    let responseText: string | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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

        responseText = textContent.text;
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = msg.includes("terminated") || msg.includes("ECONNRESET") || msg.includes("socket hang up") || msg.includes("overloaded");
        if (isRetryable && attempt < 3) {
          const delay = attempt * 15_000;
          console.warn(`[ContentPiece] Claude call attempt ${attempt} failed (${msg}), retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    if (!responseText) {
      throw new Error("No response from Claude after retries");
    }

    // Parse JSON output
    metadata.set("phase", "parsing");
    metadata.set("progress", "Parsing generated content...");

    const parsed = extractJson(responseText) as {
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

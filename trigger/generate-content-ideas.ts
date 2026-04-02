import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { ContentIdeasInput, ContentIdeasInputSchema } from "../src/types/content-ideas-input";
import type { ContentIdeasOutput, ContentIdea } from "../src/types/content-ideas-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { buildContentIdeasPrompt } from "../src/prompts/content-ideas";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 8000;

export const generateContentIdeas = task({
  id: "generate-content-ideas",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: ContentIdeasInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<ContentIdeasOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    const input = ContentIdeasInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Build prompt and call Claude
    metadata.set("phase", "generation");
    metadata.set("progress", `Generating ${input.count} content ideas...`);

    const { system, user } = buildContentIdeasPrompt(input);

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
          console.warn(`[ContentIdeas] Claude call attempt ${attempt} failed (${msg}), retrying in ${delay / 1000}s...`);
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
    metadata.set("progress", "Parsing generated ideas...");

    const parsed = extractJson(responseText) as { ideas: ContentIdea[] };

    const output: ContentIdeasOutput = {
      ideas: parsed.ideas,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        ideas_count: parsed.ideas.length,
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

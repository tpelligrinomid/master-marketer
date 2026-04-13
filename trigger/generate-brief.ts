import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { BriefInput, BriefInputSchema } from "../src/types/brief-input";
import { BriefOutput } from "../src/types/brief-output";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { buildBriefPrompt } from "../src/prompts/brief";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 32000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

type UserContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "url"; url: string } };

async function callClaude(
  client: Anthropic,
  system: string,
  userContent: UserContentBlock[]
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: userContent as never }],
      });
      const response = await stream.finalMessage();
      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }
      return textContent.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Claude] Attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  throw new Error("Unreachable");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export const generateBrief = task({
  id: "generate-brief",
  machine: "large-1x",
  maxDuration: 1800,
  retry: { maxAttempts: 1 },
  run: async (
    payload: BriefInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<BriefOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    const input = BriefInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const client = new Anthropic({ apiKey });

    metadata.set("phase", "generation");
    metadata.set("progress", `Generating brief: ${input.title}`);

    const { system, userContent } = buildBriefPrompt(input);
    const markdown = await callClaude(client, system, userContent);

    const output: BriefOutput = {
      type: "brief",
      title: input.title,
      full_document_markdown: markdown,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        total_word_count: countWords(markdown),
        reference_deliverables_used: input.reference_deliverables.length,
        reference_images_used: input.reference_images.length,
      },
    };

    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(_callback, _jobId || "unknown", "completed", output);
    }

    metadata.set("progress", "Complete");
    return output;
  },
});

import { task } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import {
  DeliverableIntakeInput,
  DeliverableIntakeInputSchema,
  DeliverableOutput,
} from "../src/types/deliverable-intake";
import { buildDeliverablePrompt } from "../src/prompts/deliverable-intake";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 8192;

export const analyzeDeliverable = task({
  id: "analyze-deliverable",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: DeliverableIntakeInput): Promise<DeliverableOutput> => {
    // Validate input
    const input = DeliverableIntakeInputSchema.parse(payload);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Build prompt for this deliverable type
    const { system, user } = buildDeliverablePrompt(input);

    // Call Claude
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    const parsed = extractJson(textContent.text) as Omit<DeliverableOutput, "metadata">;

    // Add metadata
    const output: DeliverableOutput = {
      ...parsed,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
      },
    } as DeliverableOutput;

    return output;
  },
});

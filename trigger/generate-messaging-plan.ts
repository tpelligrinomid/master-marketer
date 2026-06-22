import { task, metadata } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import {
  MessagingPlanInput,
  MessagingPlanInputSchema,
} from "../src/types/messaging-plan-input";
import { TaskCallback, deliverTaskResult } from "../src/lib/task-callback";
import { buildMessagingPlanPrompt } from "../src/prompts/messaging-plan";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 32000;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Markdown-first output. Mirrors the research generator's contract:
 * `content_raw` is the full markdown plan; `content_structured` is null
 * (there is no structured JSON schema for this deliverable).
 */
interface MessagingPlanOutput {
  type: "messaging_plan";
  content_raw: string;
  content_structured: null;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
    word_count: number;
  };
}

async function callClaude(
  client: Anthropic,
  system: string,
  user: string
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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

      return textContent.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[MessagingPlan] Claude attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  throw new Error("Unreachable");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export const generateMessagingPlan = task({
  id: "generate-messaging-plan",
  maxDuration: 900, // 15 minutes
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 120000,
    factor: 2,
    randomize: true,
  },
  run: async (
    payload: MessagingPlanInput & { _callback?: TaskCallback; _jobId?: string }
  ): Promise<MessagingPlanOutput> => {
    const { _callback, _jobId, ...rawInput } = payload;

    const input = MessagingPlanInputSchema.parse(rawInput);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // ═══════════════════════════════════════════════
    // Phase 1: Generation
    // ═══════════════════════════════════════════════
    metadata.set("phase", "generation");
    metadata.set("progress", "Generating messaging plan...");

    const { system, user } = buildMessagingPlanPrompt(input);
    const planMarkdown = await callClaude(client, system, user);

    // ═══════════════════════════════════════════════
    // Phase 2: Assembly
    // ═══════════════════════════════════════════════
    metadata.set("phase", "assembly");
    metadata.set("progress", "Assembling final document...");

    const companyName = input.client?.company_name;

    // Prepend the document header (the prompt reserves h1 for assembly).
    // Matches docs/Messaging-Plan-Template.md: `# Messaging Plan` + bold client
    // subtitle + italic date.
    const date = new Date().toISOString().slice(0, 10);
    const headerLines = ["# Messaging Plan"];
    if (companyName) headerLines.push(`**${companyName}**`);
    headerLines.push("", `*${date}*`);
    const header = headerLines.join("\n");
    const fullDocument = `${header}\n\n${planMarkdown.trim()}\n`;

    const output: MessagingPlanOutput = {
      type: "messaging_plan",
      content_raw: fullDocument,
      content_structured: null,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
        word_count: countWords(fullDocument),
      },
    };

    // ═══════════════════════════════════════════════
    // Phase 3: Webhook Callback Delivery
    // ═══════════════════════════════════════════════
    if (_callback) {
      metadata.set("progress", "Delivering results via callback...");
      await deliverTaskResult(_callback, _jobId || "unknown", "completed", output);
    }

    metadata.set("progress", "Complete");
    return output;
  },
  // Fires only after all retries are exhausted (terminal failure). Deliver a
  // failure callback so MiD can surface the error to the strategist.
  onFailure: async ({ payload, error }) => {
    const { _callback, _jobId } = payload;
    if (!_callback) return;
    const message = error instanceof Error ? error.message : String(error);
    await deliverTaskResult(_callback, _jobId || "unknown", "failed", undefined, message);
  },
});

import { task } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import {
  MeetingNotesInput,
  MeetingNotesInputSchema,
  MeetingNotesOutput,
} from "../src/types/meeting-notes";
import {
  MEETING_NOTES_SYSTEM_PROMPT,
  buildMeetingNotesPrompt,
} from "../src/prompts/meeting-notes";
import { extractJson } from "../src/lib/json-utils";

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 4096;

export const analyzeMeetingNotes = task({
  id: "analyze-meeting-notes",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: MeetingNotesInput): Promise<MeetingNotesOutput> => {
    // Validate input
    const input = MeetingNotesInputSchema.parse(payload);

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Build prompt
    const userPrompt = buildMeetingNotesPrompt(input);

    // Call Claude
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: MEETING_NOTES_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    const parsed = extractJson(textContent.text) as Omit<MeetingNotesOutput, "metadata">;

    // Validate sentiment bullets count
    if (parsed.sentiment?.bullets?.length !== 5) {
      console.warn(
        `Expected 5 sentiment bullets, got ${parsed.sentiment?.bullets?.length || 0}`
      );
    }

    // Validate sentiment confidence range
    if (
      parsed.sentiment?.confidence < 0 ||
      parsed.sentiment?.confidence > 1
    ) {
      console.warn(
        `Sentiment confidence ${parsed.sentiment?.confidence} out of range, clamping`
      );
      parsed.sentiment.confidence = Math.max(
        0,
        Math.min(1, parsed.sentiment.confidence)
      );
    }

    // Add metadata
    const output: MeetingNotesOutput = {
      ...parsed,
      metadata: {
        model: MODEL,
        version: 1,
        generated_at: new Date().toISOString(),
      },
    };

    return output;
  },
});

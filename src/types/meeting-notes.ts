import { z } from "zod";

// --- Input Schema ---

const StructuredTranscriptEntrySchema = z.object({
  speaker: z.string(),
  text: z.string(),
  start_time: z.number().optional(),
});

export const MeetingNotesInputSchema = z.object({
  transcript: z.union([
    z.string(), // Plain text with speaker labels embedded
    z.array(StructuredTranscriptEntrySchema), // Structured array
  ]),
  meeting_title: z.string().optional(),
  meeting_date: z.string().optional(), // ISO date string
  participants: z.array(z.string()).optional(),
  guidance: z.string().optional(), // Optional steering for the analysis
});

export type MeetingNotesInput = z.infer<typeof MeetingNotesInputSchema>;
export type StructuredTranscriptEntry = z.infer<typeof StructuredTranscriptEntrySchema>;

// --- Output Schema ---

export interface ActionItem {
  item: string;
  assignee: string | null;
  due: string | null; // ISO date or relative like "next week"
  context: string;
}

export interface SentimentHighlight {
  speaker: string;
  quote: string;
}

export interface Sentiment {
  label: "positive" | "neutral" | "negative";
  confidence: number; // 0.00 - 1.00
  bullets: string[]; // Exactly 5
  highlights: SentimentHighlight[]; // 0-3
  topics: string[]; // 0-6
}

export interface MeetingNotesOutput {
  summary: string;
  action_items: ActionItem[];
  decisions: string[];
  key_topics: string[];
  sentiment: Sentiment;
  metadata: {
    model: string;
    version: number;
    generated_at: string;
  };
}

// --- Job Status ---

export type JobStatus = "accepted" | "processing" | "complete" | "failed";

export interface JobResponse<T = unknown> {
  jobId: string;
  status: JobStatus;
  progress?: string;
  output?: T;
  error?: string;
}

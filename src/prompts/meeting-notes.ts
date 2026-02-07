import { MeetingNotesInput, StructuredTranscriptEntry } from "../types/meeting-notes";

export const MEETING_NOTES_SYSTEM_PROMPT = `You are an expert meeting analyst who extracts structured intelligence from meeting transcripts. You are precise, thorough, and focus on actionable output.

Your job is to analyze a meeting transcript and return a structured JSON object containing:
1. A summary of the meeting
2. Action items with assignees and due dates
3. Decisions made
4. Key topics discussed
5. Sentiment analysis

You follow these principles:
- Extract what's explicitly stated, don't invent or assume
- Attribute action items to specific people when mentioned
- Capture the actual tone and sentiment of the meeting, not what you think it should be
- Be concise but complete
- Use the participants list to match speaker names when provided

You output valid JSON only. No markdown, no explanations outside the JSON.`;

function formatTranscript(transcript: string | StructuredTranscriptEntry[]): string {
  if (typeof transcript === "string") {
    return transcript;
  }

  // Structured array — format as readable transcript
  return transcript
    .map((entry) => {
      const timestamp = entry.start_time !== undefined
        ? `[${Math.floor(entry.start_time / 60)}:${String(entry.start_time % 60).padStart(2, "0")}] `
        : "";
      return `${timestamp}${entry.speaker}: ${entry.text}`;
    })
    .join("\n");
}

export function buildMeetingNotesPrompt(input: MeetingNotesInput): string {
  const transcriptText = formatTranscript(input.transcript);

  const contextLines: string[] = [];

  if (input.meeting_title) {
    contextLines.push(`Meeting Title: ${input.meeting_title}`);
  }
  if (input.meeting_date) {
    contextLines.push(`Meeting Date: ${input.meeting_date}`);
  }
  if (input.participants?.length) {
    contextLines.push(`Participants: ${input.participants.join(", ")}`);
  }

  const contextBlock = contextLines.length > 0
    ? `## Meeting Context\n${contextLines.join("\n")}\n\n`
    : "";

  const guidanceBlock = input.guidance
    ? `## Analysis Guidance\n${input.guidance}\n\n`
    : "";

  return `${contextBlock}${guidanceBlock}## Transcript
${transcriptText}

---

## Analysis Instructions

Analyze the transcript above and return a JSON object with the following structure:

\`\`\`json
{
  "summary": "A 2-3 paragraph summary covering key discussion points, decisions made, and overall outcome. Be specific and reference actual topics discussed.",

  "action_items": [
    {
      "item": "Clear description of what needs to be done",
      "assignee": "Person's name or null if not specified",
      "due": "Date (YYYY-MM-DD) or relative term ('next week', 'by Friday') or null if not specified",
      "context": "Brief context for why this action item exists"
    }
  ],

  "decisions": [
    "Each decision as a complete statement, e.g., 'Approved Q2 budget increase of 15%'"
  ],

  "key_topics": [
    "Short topic labels that capture what was discussed, e.g., 'Budget approval', 'Launch timeline'"
  ],

  "sentiment": {
    "label": "<positive|neutral|negative>",
    "confidence": <0.00-1.00>,
    "bullets": [
      "Exactly 5 bullets, each 8-18 words",
      "High-signal, non-redundant, standalone statements",
      "Start with strong verb, attribute when helpful",
      "Focus on outcome, risk, decision, owner, date",
      "No fluff like 'great meeting' or 'various updates'"
    ],
    "highlights": [
      {
        "speaker": "Speaker Name",
        "quote": "Short pull-quote that supports the sentiment label or highlights key risk/decision"
      }
    ],
    "topics": ["budget", "launch", "risk", "scope"]
  }
}
\`\`\`

## Sentiment Labeling Rules

**Label definitions:**
- **positive**: Overall tone constructive/supportive, progress or solutions outweigh blockers
- **neutral**: Mixed/ambiguous tone, routine updates, no strong positive/negative signal
- **negative**: Frustration, risk, blockers, missed deadlines, conflict, or slipping delivery

**Confidence calibration:**
- 0.85–1.00: Clear, consistent evidence (multiple explicit cues)
- 0.60–0.84: Some signals but mixed or sparse
- 0.30–0.59: Weak/ambiguous; short or noisy transcript
- 0.00–0.29: Insufficient content to judge

**Bullets requirements:**
- Exactly 5 bullets
- Each 8-18 words
- High-signal, non-redundant, standalone
- Start with a strong verb; avoid fluff
- Attribute when helpful: "Sarah flagged creative is behind; launch still targeted for Thursday"
- Prefer outcome, risk, decision, owner, date. No speculation.

**Highlights:**
- 0-3 short pull-quotes with speaker name
- Support the sentiment label or highlight key risks/decisions
- Only include if there are genuinely notable quotes

**Topics:**
- 0-6 short tags
- Examples: "launch", "risk", "scope", "delivery", "hiring", "budget", "creative", "timeline"

Return ONLY the JSON object. No other text.`;
}

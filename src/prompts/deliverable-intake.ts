import { DeliverableIntakeInput, DeliverableType } from "../types/deliverable-intake";

const BASE_SYSTEM_PROMPT = `You are an expert marketing analyst who extracts and structures information from documents. You are precise, thorough, and focus on extracting what is explicitly stated rather than fabricating content.

Your job is to analyze a document and return a structured JSON object containing:
1. A descriptive title for the document
2. Structured content organized by deliverable type
3. A concise summary (1 paragraph)

You follow these principles:
- Extract only what's explicitly stated in the document
- Leave fields as empty arrays or empty strings if information is not present
- Do not invent, assume, or fabricate data
- Be precise with terminology and quotes
- Maintain the original context and meaning

You output valid JSON only. No markdown, no explanations outside the JSON.`;

const TYPE_EXTENSIONS: Record<DeliverableType, string> = {
  roadmap: `

For roadmap deliverables, focus on:
- Identifying strategic vision and time horizons
- Organizing initiatives into phases with dependencies
- Extracting success metrics and milestones
- Highlighting risks and mitigation strategies`,

  plan: `

For plan deliverables, focus on:
- Defining clear objectives and target audiences
- Identifying channels, tactics, and timelines
- Extracting KPIs and success metrics
- Organizing budget estimates where mentioned`,

  brief: `

For brief deliverables, focus on:
- Capturing project background and objectives
- Defining deliverables with formats and due dates
- Listing requirements, constraints, and references
- Extracting approval criteria`,
};

const SCHEMA_EXAMPLES: Record<DeliverableType, string> = {
  roadmap: `{
  "type": "roadmap",
  "title": "Descriptive title for the roadmap",
  "summary": "1-paragraph summary of the roadmap",
  "content_structured": {
    "type": "roadmap",
    "vision": "Strategic vision statement",
    "time_horizon": "e.g. Q1 2025 - Q4 2025",
    "phases": [
      {
        "name": "Phase name",
        "timeframe": "e.g. Q1 2025",
        "objectives": ["Objective 1", "Objective 2"],
        "initiatives": [
          {
            "title": "Initiative title",
            "description": "What this initiative involves",
            "priority": "high | medium | low",
            "dependencies": ["Other initiative or prerequisite"]
          }
        ],
        "success_metrics": ["Metric 1", "Metric 2"]
      }
    ],
    "risks": [
      {
        "risk": "Description of the risk",
        "mitigation": "How to mitigate it",
        "likelihood": "high | medium | low"
      }
    ]
  }
}`,

  plan: `{
  "type": "plan",
  "title": "Descriptive title for the marketing plan",
  "summary": "1-paragraph summary of the plan",
  "content_structured": {
    "type": "plan",
    "objective": "Primary objective of the plan",
    "target_audience": "Who this plan targets",
    "channels": ["Channel 1", "Channel 2"],
    "tactics": [
      {
        "tactic": "Tactic name",
        "channel": "Which channel",
        "description": "What this tactic involves",
        "timeline": "When it runs",
        "kpis": ["KPI 1", "KPI 2"],
        "budget_estimate": "$X,XXX or null if not mentioned"
      }
    ],
    "success_metrics": [
      {
        "metric": "Metric name",
        "target": "Target value",
        "measurement_method": "How to measure"
      }
    ],
    "timeline": {
      "start_date": "YYYY-MM-DD or descriptive",
      "end_date": "YYYY-MM-DD or descriptive",
      "milestones": [
        {
          "date": "YYYY-MM-DD or descriptive",
          "milestone": "What happens"
        }
      ]
    }
  }
}`,

  brief: `{
  "type": "brief",
  "title": "Descriptive title for the brief",
  "summary": "1-paragraph summary of the brief",
  "content_structured": {
    "type": "brief",
    "project_name": "Name of the project",
    "background": "Project background and context",
    "objective": "What the project aims to achieve",
    "target_audience": "Who this is for",
    "key_messages": ["Message 1", "Message 2"],
    "deliverables": [
      {
        "deliverable": "What needs to be produced",
        "format": "e.g. PDF, video, landing page",
        "due_date": "YYYY-MM-DD or null if not specified"
      }
    ],
    "requirements": ["Requirement 1", "Requirement 2"],
    "constraints": ["Constraint 1", "Constraint 2"],
    "references": ["Reference or inspiration 1"],
    "approval_criteria": "What constitutes approval"
  }
}`,
};

export function buildDeliverablePrompt(input: DeliverableIntakeInput): {
  system: string;
  user: string;
} {
  const system = BASE_SYSTEM_PROMPT + TYPE_EXTENSIONS[input.deliverable_type];

  const contextLines: string[] = [
    `Contract: ${input.context.contract_name}`,
    `Industry: ${input.context.industry}`,
  ];
  if (input.context.additional_notes) {
    contextLines.push(`Additional Notes: ${input.context.additional_notes}`);
  }

  const user = `## Context
${contextLines.join("\n")}

## Document Content
${input.content}

---

## Analysis Instructions

Analyze the document above and return a JSON object with the following structure:

\`\`\`json
${SCHEMA_EXAMPLES[input.deliverable_type]}
\`\`\`

Important:
- Leave fields empty ([] or "") if not found in the document
- Do not fabricate information
- Extract exact quotes where relevant
- Use the context provided to inform extraction

Return ONLY the JSON object. No other text.`;

  return { system, user };
}

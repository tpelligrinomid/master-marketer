import { z } from "zod";

// --- Input Schema ---

const DeliverableContextSchema = z.object({
  contract_name: z.string(),
  industry: z.string(),
  additional_notes: z.string().optional(),
});

export const DeliverableIntakeInputSchema = z.object({
  content: z.string(),
  deliverable_type: z.enum(["roadmap", "plan", "brief"]),
  context: DeliverableContextSchema,
});

export type DeliverableIntakeInput = z.infer<typeof DeliverableIntakeInputSchema>;
export type DeliverableType = DeliverableIntakeInput["deliverable_type"];

// --- Output Schemas ---

interface DeliverableMetadata {
  model: string;
  version: number;
  generated_at: string;
}

export interface RoadmapOutput {
  type: "roadmap";
  title: string;
  summary: string;
  content_structured: {
    type: "roadmap";
    vision: string;
    time_horizon: string;
    phases: Array<{
      name: string;
      timeframe: string;
      objectives: string[];
      initiatives: Array<{
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
        dependencies: string[];
      }>;
      success_metrics: string[];
    }>;
    risks: Array<{
      risk: string;
      mitigation: string;
      likelihood: "high" | "medium" | "low";
    }>;
  };
  metadata: DeliverableMetadata;
}

export interface PlanOutput {
  type: "plan";
  title: string;
  summary: string;
  content_structured: {
    type: "plan";
    objective: string;
    target_audience: string;
    channels: string[];
    tactics: Array<{
      tactic: string;
      channel: string;
      description: string;
      timeline: string;
      kpis: string[];
      budget_estimate: string | null;
    }>;
    success_metrics: Array<{
      metric: string;
      target: string;
      measurement_method: string;
    }>;
    timeline: {
      start_date: string;
      end_date: string;
      milestones: Array<{
        date: string;
        milestone: string;
      }>;
    };
  };
  metadata: DeliverableMetadata;
}

export interface BriefOutput {
  type: "brief";
  title: string;
  summary: string;
  content_structured: {
    type: "brief";
    project_name: string;
    background: string;
    objective: string;
    target_audience: string;
    key_messages: string[];
    deliverables: Array<{
      deliverable: string;
      format: string;
      due_date: string | null;
    }>;
    requirements: string[];
    constraints: string[];
    references: string[];
    approval_criteria: string;
  };
  metadata: DeliverableMetadata;
}

export type DeliverableOutput = RoadmapOutput | PlanOutput | BriefOutput;

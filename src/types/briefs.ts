import { z } from "zod";
import { PLATFORMS, CAMPAIGN_GOALS } from "./platforms";

export const CreateBriefSchema = z.object({
  name: z.string().min(1),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
  campaign_goal: z.enum(CAMPAIGN_GOALS),
  product_focus: z.string().optional(),
  audience_segment: z.string().optional(),
  key_messages: z.array(z.string()).optional(),
  cta: z.string().optional(),
  tone_overrides: z.string().optional(),
  competitor_context: z.string().optional(),
  additional_instructions: z.string().optional(),
  file_ids: z.array(z.string().uuid()).optional(),
});

export const UpdateBriefSchema = CreateBriefSchema.partial();

export type CreateBriefInput = z.infer<typeof CreateBriefSchema>;
export type UpdateBriefInput = z.infer<typeof UpdateBriefSchema>;

export interface Brief {
  id: string;
  project_id: string;
  name: string;
  platforms: string[];
  campaign_goal: string;
  product_focus: string | null;
  audience_segment: string | null;
  key_messages: string[] | null;
  cta: string | null;
  tone_overrides: string | null;
  competitor_context: string | null;
  additional_instructions: string | null;
  file_ids: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

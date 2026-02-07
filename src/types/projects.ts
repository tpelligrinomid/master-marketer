import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  company_name: z.string().min(1),
  company_website: z.string().url().optional(),
  industry: z.string().optional(),
  target_audience: z.object({
    roles: z.array(z.string()).optional(),
    company_sizes: z.array(z.string()).optional(),
    verticals: z.array(z.string()).optional(),
  }).optional(),
  brand_voice: z.string().optional(),
  product_description: z.string().optional(),
  key_differentiators: z.array(z.string()).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export interface Project {
  id: string;
  name: string;
  company_name: string;
  company_website: string | null;
  industry: string | null;
  target_audience: {
    roles?: string[];
    company_sizes?: string[];
    verticals?: string[];
  } | null;
  brand_voice: string | null;
  product_description: string | null;
  key_differentiators: string[] | null;
  created_at: string;
  updated_at: string;
}

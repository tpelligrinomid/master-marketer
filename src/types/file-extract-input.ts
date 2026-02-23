import { z } from "zod";

export const FileExtractInputSchema = z.object({
  file_url: z.string().url(),
  file_name: z.string(),
  mime_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]),
  callback_url: z.string().url().optional(),
  metadata: z.object({
    asset_id: z.string().uuid(),
    contract_id: z.string().uuid(),
    content_type_slug: z.string().optional(),
  }),
});

export type FileExtractInput = z.infer<typeof FileExtractInputSchema>;

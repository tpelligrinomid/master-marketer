import { z } from "zod";

export const PlaylistExtractInputSchema = z.object({
  playlist_url: z.string(),
  callback_url: z.string().url().optional(),
  metadata: z
    .object({
      batch_id: z.string().uuid(),
      item_id: z.string().uuid(),
      contract_id: z.string().uuid(),
    })
    .optional(),
});

export type PlaylistExtractInput = z.infer<typeof PlaylistExtractInputSchema>;

import { z } from "zod";

export const BlogScrapeInputSchema = z.object({
  url: z.string().url(),
  callback_url: z.string().url().optional(),
  metadata: z.object({
    batch_id: z.string().uuid(),
    item_id: z.string().uuid(),
    contract_id: z.string().uuid(),
  }),
});

export type BlogScrapeInput = z.infer<typeof BlogScrapeInputSchema>;

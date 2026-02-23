import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { BlogScrapeInputSchema } from "../../types/blog-scrape-input";
import { jobStore } from "../../lib/job-store";
import { getEnv } from "../../config/env";

export async function blogScrapeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parseResult = BlogScrapeInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error("[intake/blog-scrape] Validation failed:", JSON.stringify(parseResult.error.flatten()));
      console.error("[intake/blog-scrape] Received keys:", Object.keys(req.body));
      res.status(400).json({
        error: "Invalid input",
        details: parseResult.error.flatten(),
      });
      return;
    }

    const input = parseResult.data;
    const jobId = uuidv4();

    const env = getEnv();
    const triggerPayload = {
      ...input,
      _jobId: jobId,
      _apiKey: env.API_KEY,
      _apifyApiKey: env.APIFY_API_KEY,
    };

    const handle = await tasks.trigger("scrape-blog-url", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message: "Blog scrape started. Results will be delivered to callback_url when complete.",
    });
  } catch (error) {
    next(error);
  }
}

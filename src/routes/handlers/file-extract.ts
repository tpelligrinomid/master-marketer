import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { FileExtractInputSchema } from "../../types/file-extract-input";
import { jobStore } from "../../lib/job-store";
import { getEnv } from "../../config/env";

export async function fileExtractHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parseResult = FileExtractInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error("[intake/file-extract] Validation failed:", JSON.stringify(parseResult.error.flatten()));
      console.error("[intake/file-extract] Received keys:", Object.keys(req.body));
      res.status(400).json({
        error: "Invalid input",
        details: parseResult.error.flatten(),
      });
      return;
    }

    const input = parseResult.data;
    const jobId = uuidv4();

    const triggerPayload = {
      ...input,
      _jobId: jobId,
      _apiKey: getEnv().API_KEY,
    };

    const handle = await tasks.trigger("file-extract", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message: "File extraction started. Results will be delivered to callback_url when complete.",
    });
  } catch (error) {
    next(error);
  }
}

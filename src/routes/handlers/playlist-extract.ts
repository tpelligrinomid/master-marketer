import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { PlaylistExtractInputSchema } from "../../types/playlist-extract-input";
import { jobStore } from "../../lib/job-store";
import { getEnv } from "../../config/env";

export async function playlistExtractHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parseResult = PlaylistExtractInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error("[playlist-extract] Validation failed:", JSON.stringify(parseResult.error.flatten()));
      console.error("[playlist-extract] Received keys:", Object.keys(req.body));
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
      _youtubeApiKey: env.YOUTUBE_API_KEY,
    };

    const handle = await tasks.trigger("extract-playlist-urls", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message: "Playlist extraction started. Results will be delivered to callback_url when complete.",
    });
  } catch (error) {
    next(error);
  }
}

import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { RoadmapInputSchema } from "../types/roadmap-input";
import { jobStore } from "../lib/job-store";
import { getEnv } from "../config/env";

const router = Router();

/**
 * Extract webhook-related fields from request body.
 * These are stripped before Zod validation so they don't interfere with schemas.
 */
function extractWebhookFields(body: Record<string, unknown>): {
  callbackUrl?: string;
  callbackMetadata?: Record<string, unknown>;
} {
  const callbackUrl =
    typeof body.callback_url === "string" && body.callback_url.startsWith("http")
      ? body.callback_url
      : undefined;

  const callbackMetadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;

  return { callbackUrl, callbackMetadata };
}

/**
 * Strip webhook fields from the body before passing to Zod validation.
 */
function stripWebhookFields(body: Record<string, unknown>): Record<string, unknown> {
  const { callback_url: _, metadata: __, ...rest } = body;
  return rest;
}

/**
 * Build _callback object to pass through to the Trigger.dev task payload.
 */
function buildCallbackPayload(callbackUrl?: string, callbackMetadata?: Record<string, unknown>) {
  if (!callbackUrl) return undefined;
  return {
    url: callbackUrl,
    api_key: getEnv().API_KEY,
    metadata: callbackMetadata,
  };
}

// POST /roadmap
router.post(
  "/roadmap",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
      const body = stripWebhookFields(req.body);

      const parseResult = RoadmapInputSchema.safeParse(body);
      if (!parseResult.success) {
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
        _callback: buildCallbackPayload(callbackUrl, callbackMetadata),
        _jobId: jobId,
      };

      const handle = await tasks.trigger("generate-roadmap", triggerPayload);
      jobStore.create(jobId, handle.id);

      res.status(202).json({
        jobId,
        triggerRunId: handle.id,
        status: "accepted",
        message:
          "Roadmap generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { MeetingNotesInputSchema } from "../types/meeting-notes";
import { DeliverableIntakeInputSchema, DeliverableType } from "../types/deliverable-intake";
import { ResearchInputSchema } from "../types/research-input";
import { jobStore } from "../lib/job-store";
import { watchRunAndDeliver, CallbackMetadata } from "../lib/webhook-delivery";
import { getEnv } from "../config/env";

const router = Router();

/**
 * Extract webhook-related fields from request body.
 * These are stripped before Zod validation so they don't interfere with schemas.
 */
function extractWebhookFields(body: Record<string, unknown>): {
  callbackUrl?: string;
  callbackMetadata?: CallbackMetadata;
} {
  const callbackUrl =
    typeof body.callback_url === "string" && body.callback_url.startsWith("http")
      ? body.callback_url
      : undefined;

  const callbackMetadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as CallbackMetadata)
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

// Factory for deliverable intake routes (roadmap, plan, brief)
function createIntakeRoute(type: DeliverableType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
      const body = { ...stripWebhookFields(req.body), deliverable_type: type };

      const parseResult = DeliverableIntakeInputSchema.safeParse(body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Invalid input",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const input = parseResult.data;
      const jobId = uuidv4();

      // Trigger the async task
      const handle = await tasks.trigger("analyze-deliverable", input);

      // Store job with trigger run ID
      jobStore.create(jobId, handle.id);

      // Start background webhook delivery if callback provided
      if (callbackUrl) {
        watchRunAndDeliver({
          triggerRunId: handle.id,
          callbackUrl,
          jobId,
          callbackMetadata,
          apiKey: getEnv().API_KEY,
        });
      }

      res.status(202).json({
        jobId,
        triggerRunId: handle.id,
        status: "accepted",
        message: `${type} analysis started. Poll GET /api/jobs/:jobId for status.`,
      });
    } catch (error) {
      next(error);
    }
  };
}

// POST /intake/meeting-notes
router.post(
  "/meeting-notes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
      const body = stripWebhookFields(req.body);

      const parseResult = MeetingNotesInputSchema.safeParse(body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Invalid input",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const input = parseResult.data;
      const jobId = uuidv4();

      const handle = await tasks.trigger("analyze-meeting-notes", input);
      jobStore.create(jobId, handle.id);

      if (callbackUrl) {
        watchRunAndDeliver({
          triggerRunId: handle.id,
          callbackUrl,
          jobId,
          callbackMetadata,
          apiKey: getEnv().API_KEY,
        });
      }

      res.status(202).json({
        jobId,
        triggerRunId: handle.id,
        status: "accepted",
        message: "Meeting notes analysis started. Poll GET /api/jobs/:jobId for status.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /intake/research
router.post(
  "/research",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
      const body = stripWebhookFields(req.body);

      const parseResult = ResearchInputSchema.safeParse(body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Invalid input",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const input = parseResult.data;
      const jobId = uuidv4();

      const handle = await tasks.trigger("generate-research", input);
      jobStore.create(jobId, handle.id);

      if (callbackUrl) {
        watchRunAndDeliver({
          triggerRunId: handle.id,
          callbackUrl,
          jobId,
          callbackMetadata,
          apiKey: getEnv().API_KEY,
        });
      }

      res.status(202).json({
        jobId,
        triggerRunId: handle.id,
        status: "accepted",
        message:
          "Research generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /intake/roadmap
router.post("/roadmap", createIntakeRoute("roadmap"));

// POST /intake/plan
router.post("/plan", createIntakeRoute("plan"));

// POST /intake/brief
router.post("/brief", createIntakeRoute("brief"));

export default router;

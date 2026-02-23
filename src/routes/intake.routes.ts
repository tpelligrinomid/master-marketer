import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { MeetingNotesInputSchema } from "../types/meeting-notes";
import { DeliverableIntakeInputSchema, DeliverableType } from "../types/deliverable-intake";
import { jobStore } from "../lib/job-store";
import { fetchAndParseFile } from "../lib/file-parse";
import { getEnv } from "../config/env";
import {
  researchHandler,
  seoAuditHandler,
  contentPlanHandler,
  abmPlanHandler,
} from "./generate.routes";
import { blogScrapeHandler } from "./handlers/blog-scrape";
import { fileExtractHandler } from "./handlers/file-extract";

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
 * The task itself will POST results to this URL when it completes.
 */
function buildCallbackPayload(callbackUrl?: string, callbackMetadata?: Record<string, unknown>) {
  if (!callbackUrl) return undefined;
  return {
    url: callbackUrl,
    api_key: getEnv().API_KEY,
    metadata: callbackMetadata,
  };
}

// Factory for deliverable intake routes (roadmap, plan, brief)
function createIntakeRoute(type: DeliverableType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
      const body = { ...stripWebhookFields(req.body), deliverable_type: type };

      const parseResult = DeliverableIntakeInputSchema.safeParse(body);
      if (!parseResult.success) {
        console.error(`[intake/${type}] Validation failed:`, JSON.stringify(parseResult.error.flatten()));
        console.error(`[intake/${type}] Received keys:`, Object.keys(body));
        res.status(400).json({
          error: "Invalid input",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const input = parseResult.data;
      const jobId = uuidv4();

      // If file_url provided, fetch and parse the file to get content
      let content = input.content;
      if (!content && input.file_url) {
        console.log(`[intake/${type}] Fetching file: ${input.file_url}`);
        content = await fetchAndParseFile(input.file_url);
        console.log(`[intake/${type}] Parsed ${content.length} chars from file`);
      }

      // Pass callback info through to the Trigger.dev task — IT will deliver results
      const triggerPayload = {
        ...input,
        content, // always a string by this point
        _callback: buildCallbackPayload(callbackUrl, callbackMetadata),
        _jobId: jobId,
      };

      const handle = await tasks.trigger("analyze-deliverable", triggerPayload);
      jobStore.create(jobId, handle.id);

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
        console.error("[intake/meeting-notes] Validation failed:", JSON.stringify(parseResult.error.flatten()));
        console.error("[intake/meeting-notes] Received keys:", Object.keys(body));
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

      const handle = await tasks.trigger("analyze-meeting-notes", triggerPayload);
      jobStore.create(jobId, handle.id);

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

// Blog scrape
router.post("/blog-scrape", blogScrapeHandler);

// File extraction
router.post("/file-extract", fileExtractHandler);

// Reformatter routes
router.post("/roadmap", createIntakeRoute("roadmap"));
router.post("/plan", createIntakeRoute("plan"));
router.post("/brief", createIntakeRoute("brief"));

// Legacy aliases — canonical routes are at /api/generate/*
router.post("/research", researchHandler);
router.post("/seo-audit", seoAuditHandler);
router.post("/seo_audit", seoAuditHandler);
router.post("/content-plan", contentPlanHandler);
router.post("/content_plan", contentPlanHandler);
router.post("/abm-plan", abmPlanHandler);
router.post("/abm_plan", abmPlanHandler);

export default router;

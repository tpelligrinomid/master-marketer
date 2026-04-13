import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { RoadmapInputSchema } from "../types/roadmap-input";
import { ResearchInputSchema } from "../types/research-input";
import { SeoAuditInputSchema } from "../types/seo-audit-input";
import { ContentPlanInputSchema } from "../types/content-plan-input";
import { AbmPlanInputSchema } from "../types/abm-plan-input";
import { ContentPieceInputSchema } from "../types/content-piece-input";
import { ContentIdeasInputSchema } from "../types/content-ideas-input";
import { CompetitiveDigestInputSchema } from "../types/competitive-digest-input";
import { BriefInputSchema } from "../types/brief-input";
import { jobStore } from "../lib/job-store";
import { getEnv } from "../config/env";
import { playlistExtractHandler } from "./handlers/playlist-extract";

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

// --- Exported handlers (also used as legacy aliases in intake.routes.ts) ---

export const researchHandler = async (req: Request, res: Response, next: NextFunction) => {
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

    const triggerPayload = {
      ...input,
      _callback: buildCallbackPayload(callbackUrl, callbackMetadata),
      _jobId: jobId,
    };

    const handle = await tasks.trigger("generate-research", triggerPayload);
    jobStore.create(jobId, handle.id);

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
};

export const seoAuditHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
    const body = stripWebhookFields(req.body);

    const parseResult = SeoAuditInputSchema.safeParse(body);
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

    const handle = await tasks.trigger("generate-seo-audit", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message:
        "SEO/AEO audit generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
    });
  } catch (error) {
    next(error);
  }
};

export const contentPlanHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
    const body = stripWebhookFields(req.body);

    const parseResult = ContentPlanInputSchema.safeParse(body);
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

    const handle = await tasks.trigger("generate-content-plan", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message:
        "Content plan generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
    });
  } catch (error) {
    next(error);
  }
};

export const abmPlanHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
    const body = stripWebhookFields(req.body);

    const parseResult = AbmPlanInputSchema.safeParse(body);
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

    const handle = await tasks.trigger("generate-abm-plan", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message:
        "ABM plan generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
    });
  } catch (error) {
    next(error);
  }
};

export const contentPieceHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
    const body = stripWebhookFields(req.body);

    const parseResult = ContentPieceInputSchema.safeParse(body);
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

    const handle = await tasks.trigger("generate-content-piece", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message:
        "Content piece generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
    });
  } catch (error) {
    next(error);
  }
};

export const contentIdeasHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
    const body = stripWebhookFields(req.body);

    const parseResult = ContentIdeasInputSchema.safeParse(body);
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

    const handle = await tasks.trigger("generate-content-ideas", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message:
        "Content ideas generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
    });
  } catch (error) {
    next(error);
  }
};

export const competitiveDigestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
    const body = stripWebhookFields(req.body);

    const parseResult = CompetitiveDigestInputSchema.safeParse(body);
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

    const handle = await tasks.trigger("generate-competitive-digest", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message:
        "Competitive digest generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
    });
  } catch (error) {
    next(error);
  }
};

export const briefHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callbackUrl, callbackMetadata } = extractWebhookFields(req.body);
    const body = stripWebhookFields(req.body);

    const parseResult = BriefInputSchema.safeParse(body);
    if (!parseResult.success) {
      console.error("[generate/brief] Validation failed:", JSON.stringify(parseResult.error.flatten()));
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

    const handle = await tasks.trigger("generate-brief", triggerPayload);
    jobStore.create(jobId, handle.id);

    res.status(202).json({
      jobId,
      triggerRunId: handle.id,
      status: "accepted",
      message:
        "Brief generation started. Results will be delivered to callback_url when complete. You can also poll GET /api/jobs/:jobId for status.",
    });
  } catch (error) {
    next(error);
  }
};

// POST /research
router.post("/research", researchHandler);

// POST /brief
router.post("/brief", briefHandler);

// POST /seo-audit
router.post("/seo-audit", seoAuditHandler);

// POST /content-plan
router.post("/content-plan", contentPlanHandler);

// POST /abm-plan
router.post("/abm-plan", abmPlanHandler);

// POST /content-piece
router.post("/content-piece", contentPieceHandler);

// POST /content-ideas
router.post("/content-ideas", contentIdeasHandler);

// POST /competitive-digest
router.post("/competitive-digest", competitiveDigestHandler);

// POST /playlist-extract
router.post("/playlist-extract", playlistExtractHandler);

export default router;

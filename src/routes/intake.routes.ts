import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { MeetingNotesInputSchema } from "../types/meeting-notes";
import { DeliverableIntakeInputSchema, DeliverableType } from "../types/deliverable-intake";
import { ResearchInputSchema } from "../types/research-input";
import { jobStore } from "../lib/job-store";

const router = Router();

// Factory for deliverable intake routes (roadmap, plan, brief)
function createIntakeRoute(type: DeliverableType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Inject deliverable_type from the URL
      const body = { ...req.body, deliverable_type: type };

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

      res.status(202).json({
        jobId,
        status: "accepted",
        message: `${type} analysis started. Poll GET /api/jobs/:jobId for status.`,
      });
    } catch (error) {
      next(error);
    }
  };
}

// POST /intake/meeting-notes
// Accepts meeting transcript, triggers async analysis, returns jobId
router.post(
  "/meeting-notes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input
      const parseResult = MeetingNotesInputSchema.safeParse(req.body);
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
      const handle = await tasks.trigger("analyze-meeting-notes", input);

      // Store job with trigger run ID
      jobStore.create(jobId, handle.id);

      res.status(202).json({
        jobId,
        status: "accepted",
        message: "Meeting notes analysis started. Poll GET /api/jobs/:jobId for status.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /intake/research
// Custom handler — different schema and task ID than deliverable routes
router.post(
  "/research",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = ResearchInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Invalid input",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const input = parseResult.data;
      const jobId = uuidv4();

      // Trigger the research generation task
      const handle = await tasks.trigger("generate-research", input);

      // Store job with trigger run ID
      jobStore.create(jobId, handle.id);

      res.status(202).json({
        jobId,
        status: "accepted",
        message:
          "Research generation started. Poll GET /api/jobs/:jobId for status. Estimated duration: 5-8 minutes.",
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

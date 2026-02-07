import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { tasks } from "@trigger.dev/sdk/v3";
import { MeetingNotesInputSchema } from "../types/meeting-notes";
import { jobStore } from "../lib/job-store";

const router = Router();

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

export default router;

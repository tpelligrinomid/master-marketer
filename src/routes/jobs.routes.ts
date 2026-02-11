import { Router, Request, Response, NextFunction } from "express";
import { runs } from "@trigger.dev/sdk/v3";
import { jobStore } from "../lib/job-store";
import { JobResponse } from "../types/meeting-notes";

const router = Router();

// GET /jobs/by-run/:triggerRunId
// Direct lookup by Trigger.dev run ID — bypasses the in-memory job store entirely.
// This is a fallback for when the job store has lost state (e.g. after Render restart).
// MiD App gets the triggerRunId from the initial 202 response and can use it to recover.
// NOTE: Must be registered BEFORE /:jobId to avoid Express matching "by-run" as a jobId.
router.get("/by-run/:triggerRunId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerRunId } = req.params;

    const run = await runs.retrieve(triggerRunId);

    if (run.status === "COMPLETED") {
      res.json({
        triggerRunId,
        status: "complete",
        output: run.output,
        completedAt: run.finishedAt,
      });
      return;
    }

    if (run.status === "FAILED" || run.status === "CANCELED") {
      res.json({
        triggerRunId,
        status: "failed",
        error: run.error?.message || `Run ended with status: ${run.status}`,
      });
      return;
    }

    // Still running
    res.json({
      triggerRunId,
      status: "processing",
      runStatus: run.status,
    });
  } catch (error: unknown) {
    // If the run doesn't exist on Trigger.dev
    if (error instanceof Error && error.message?.includes("not found")) {
      res.status(404).json({ error: "Trigger.dev run not found" });
      return;
    }
    next(error);
  }
});

// GET /jobs/:jobId
// Returns current status of an async job
router.get("/:jobId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    const job = jobStore.get(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // If already complete or failed, return cached result
    if (job.status === "complete" || job.status === "failed") {
      const response: JobResponse = {
        jobId: job.id,
        status: job.status,
        output: job.output,
        error: job.error,
      };
      res.json(response);
      return;
    }

    // Check Trigger.dev run status
    if (job.triggerRunId) {
      try {
        const run = await runs.retrieve(job.triggerRunId);

        if (run.status === "COMPLETED") {
          // Extract output and cache it
          const output = run.output;
          jobStore.setOutput(jobId, output);

          const response: JobResponse = {
            jobId: job.id,
            status: "complete",
            output,
          };
          res.json(response);
          return;
        }

        if (run.status === "FAILED" || run.status === "CANCELED") {
          const errorMsg = run.error?.message || "Task failed";
          jobStore.setError(jobId, errorMsg);

          const response: JobResponse = {
            jobId: job.id,
            status: "failed",
            error: errorMsg,
          };
          res.json(response);
          return;
        }

        // Still running
        jobStore.updateStatus(jobId, "processing");
        const response: JobResponse = {
          jobId: job.id,
          status: "processing",
          progress: `Trigger.dev run status: ${run.status}`,
        };
        res.json(response);
        return;
      } catch (triggerError) {
        // If we can't reach Trigger.dev, return current cached status
        console.error("Failed to check Trigger.dev run status:", triggerError);
      }
    }

    // Fallback to cached status
    const response: JobResponse = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;

import { JobStatus } from "../types/meeting-notes";

interface StoredJob {
  id: string;
  status: JobStatus;
  progress?: string;
  output?: unknown;
  error?: string;
  triggerRunId?: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory job store with TTL cleanup
// For production, consider Redis or another external store
class JobStore {
  private jobs: Map<string, StoredJob> = new Map();
  private readonly TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Cleanup old jobs every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  create(id: string, triggerRunId?: string): StoredJob {
    const now = Date.now();
    const job: StoredJob = {
      id,
      status: "accepted",
      triggerRunId,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job);
    return job;
  }

  get(id: string): StoredJob | undefined {
    return this.jobs.get(id);
  }

  updateStatus(id: string, status: JobStatus, progress?: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.updatedAt = Date.now();
    }
  }

  setOutput(id: string, output: unknown): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = "complete";
      job.output = output;
      job.updatedAt = Date.now();
    }
  }

  setError(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = "failed";
      job.error = error;
      job.updatedAt = Date.now();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (now - job.createdAt > this.TTL_MS) {
        this.jobs.delete(id);
      }
    }
  }
}

// Singleton instance
export const jobStore = new JobStore();

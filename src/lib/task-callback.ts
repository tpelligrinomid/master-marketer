/**
 * Callback delivery that runs INSIDE Trigger.dev tasks.
 * This is reliable because the task process stays alive for the full duration.
 * Unlike the Render-based webhook watcher, this won't die from server restarts.
 */

export interface TaskCallback {
  url: string;
  api_key?: string;
  metadata?: {
    deliverable_id?: string;
    contract_id?: string;
    title?: string;
    [key: string]: unknown;
  };
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Deliver task results to a callback URL. Call this at the end of any Trigger.dev task.
 * Handles retries and logs errors without throwing (task output is still returned normally).
 */
export async function deliverTaskResult(
  callback: TaskCallback,
  jobId: string,
  status: "completed" | "failed",
  output?: unknown,
  error?: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    job_id: jobId,
    status,
  };

  // Echo back metadata fields at top level
  if (callback.metadata) {
    if (callback.metadata.deliverable_id) payload.deliverable_id = callback.metadata.deliverable_id;
    if (callback.metadata.contract_id) payload.contract_id = callback.metadata.contract_id;
    if (callback.metadata.title) payload.title = callback.metadata.title;
  }

  if (status === "completed" && output) {
    const out = output as Record<string, unknown>;
    payload.output = {
      content_raw: out.full_document_markdown || "",
      content_structured: out,
    };
  }

  if (status === "failed" && error) {
    payload.error = error;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (callback.api_key) {
    headers["x-api-key"] = callback.api_key;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[task-callback] Delivering ${status} result to ${callback.url} (attempt ${attempt}/${MAX_RETRIES})`);

      const response = await fetch(callback.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[task-callback] Successfully delivered to ${callback.url}`);
        return;
      }

      const text = await response.text().catch(() => "");
      console.warn(`[task-callback] Attempt ${attempt}/${MAX_RETRIES} got ${response.status}: ${text}`);
    } catch (err) {
      console.warn(
        `[task-callback] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        err instanceof Error ? err.message : err
      );
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }

  console.error(`[task-callback] Failed to deliver to ${callback.url} after ${MAX_RETRIES} attempts`);
}

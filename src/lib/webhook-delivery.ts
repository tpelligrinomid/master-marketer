import { runs } from "@trigger.dev/sdk/v3";

const MAX_CALLBACK_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export interface CallbackMetadata {
  deliverable_id?: string;
  contract_id?: string;
  title?: string;
  [key: string]: unknown;
}

interface WatchOptions {
  triggerRunId: string;
  callbackUrl: string;
  jobId: string;
  callbackMetadata?: CallbackMetadata;
  apiKey?: string;
}

/**
 * Watches a Trigger.dev run in the background and POSTs the result
 * to a callback URL when complete. This decouples MiD App from needing
 * to poll — it gets pushed the result automatically.
 *
 * Runs entirely in the background (fire-and-forget from the caller's perspective).
 */
export function watchRunAndDeliver(options: WatchOptions): void {
  // Fire and forget — don't await
  deliverWhenComplete(options).catch((err) => {
    console.error(
      `[webhook-delivery] Fatal error watching run ${options.triggerRunId}:`,
      err
    );
  });
}

async function deliverWhenComplete(options: WatchOptions): Promise<void> {
  const { triggerRunId, callbackUrl, jobId, callbackMetadata, apiKey } = options;

  console.log(
    `[webhook-delivery] Watching run ${triggerRunId} for job ${jobId}, will deliver to ${callbackUrl}`
  );

  try {
    // Poll Trigger.dev until the run reaches a terminal state.
    // With pollIntervalMs=10s and SDK's MAX_POLL_ATTEMPTS=500, this will wait ~83 minutes
    // (well beyond our 45-min max task duration).
    const completedRun = await runs.poll(triggerRunId, {
      pollIntervalMs: 10_000,
    });

    const isSuccess = completedRun.status === "COMPLETED";
    const output = completedRun.output as Record<string, unknown> | undefined;

    // Build payload matching MiD App's expected webhook contract
    const payload: Record<string, unknown> = {
      job_id: jobId,
      trigger_run_id: triggerRunId,
      status: isSuccess ? "completed" : "failed",
    };

    // Echo back metadata fields at the top level (deliverable_id, contract_id, title)
    if (callbackMetadata) {
      if (callbackMetadata.deliverable_id) payload.deliverable_id = callbackMetadata.deliverable_id;
      if (callbackMetadata.contract_id) payload.contract_id = callbackMetadata.contract_id;
      if (callbackMetadata.title) payload.title = callbackMetadata.title;
    }

    if (isSuccess && output) {
      payload.output = {
        content_raw: output.full_document_markdown || "",
        content_structured: output,
      };
    }

    if (!isSuccess) {
      payload.error = completedRun.error?.message || `Run ended with status: ${completedRun.status}`;
    }

    console.log(
      `[webhook-delivery] Run ${triggerRunId} finished with status ${completedRun.status}, delivering to callback...`
    );

    await postWithRetry(callbackUrl, payload, apiKey);

    console.log(
      `[webhook-delivery] Successfully delivered result for run ${triggerRunId} to ${callbackUrl}`
    );
  } catch (err) {
    console.error(
      `[webhook-delivery] Failed to watch/deliver run ${triggerRunId}:`,
      err
    );

    // Try to notify callback of the failure
    const failPayload: Record<string, unknown> = {
      job_id: jobId,
      trigger_run_id: triggerRunId,
      status: "failed",
      error: `Webhook delivery error: ${err instanceof Error ? err.message : String(err)}`,
    };
    if (callbackMetadata?.deliverable_id) failPayload.deliverable_id = callbackMetadata.deliverable_id;
    if (callbackMetadata?.contract_id) failPayload.contract_id = callbackMetadata.contract_id;

    try {
      await postWithRetry(callbackUrl, failPayload, apiKey);
    } catch (notifyErr) {
      console.error(
        `[webhook-delivery] Could not even notify callback of failure:`,
        notifyErr
      );
    }
  }
}

async function postWithRetry(
  url: string,
  body: unknown,
  apiKey?: string,
  retries = MAX_CALLBACK_RETRIES
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return;
      }

      const text = await response.text().catch(() => "");
      console.warn(
        `[webhook-delivery] Callback POST attempt ${attempt}/${retries} got ${response.status}: ${text}`
      );
    } catch (err) {
      console.warn(
        `[webhook-delivery] Callback POST attempt ${attempt}/${retries} failed:`,
        err instanceof Error ? err.message : err
      );
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }

  throw new Error(
    `Failed to deliver webhook to ${url} after ${retries} attempts`
  );
}

import { Request, Response } from "express";
import {
  SeoEnrichKeywordRequestSchema,
  SeoEnrichKeywordErrorCode,
  SeoEnrichKeywordErrorResponse,
} from "../../types/seo-enrich-keyword";
import {
  gatherSeoOptimizeContext,
  KeywordNotFoundError,
} from "../../lib/gather-seo-optimize-context";
import { getEnv } from "../../config/env";

const ENDPOINT_TIMEOUT_MS = 15_000;

function send(
  res: Response,
  status: number,
  code: SeoEnrichKeywordErrorCode,
  message: string
) {
  const body: SeoEnrichKeywordErrorResponse = { error_code: code, message };
  res.status(status).json(body);
}

export async function seoEnrichKeywordHandler(req: Request, res: Response) {
  const parsed = SeoEnrichKeywordRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const path = first?.path.join(".") || "request";
    send(res, 400, "INVALID_REQUEST", `${path}: ${first?.message ?? "invalid"}`);
    return;
  }

  const env = getEnv();
  if (!env.DATAFORSEO_LOGIN || !env.DATAFORSEO_PASSWORD) {
    send(res, 502, "UPSTREAM_ERROR", "DataForSEO credentials not configured");
    return;
  }

  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("__TIMEOUT__")),
      ENDPOINT_TIMEOUT_MS
    );
  });

  try {
    const work = gatherSeoOptimizeContext(parsed.data, {
      dataforseoLogin: env.DATAFORSEO_LOGIN,
      dataforseoPassword: env.DATAFORSEO_PASSWORD,
    });

    const result = await Promise.race([work, timeoutPromise]);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof KeywordNotFoundError) {
      send(res, 422, "KEYWORD_NOT_FOUND", err.message);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message === "__TIMEOUT__") {
      send(res, 504, "TIMEOUT", `Enrichment exceeded ${ENDPOINT_TIMEOUT_MS / 1000}s budget`);
      return;
    }
    console.error("[seo/enrich-keyword] Failed:", err);
    send(res, 502, "UPSTREAM_ERROR", message);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

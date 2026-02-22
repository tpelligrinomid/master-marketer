import { task, metadata } from "@trigger.dev/sdk/v3";
import { BlogScrapeInput } from "../src/types/blog-scrape-input";
import { BlogScrapeOutput } from "../src/types/blog-scrape-output";
import { extractArticle } from "../src/lib/html-to-markdown";

const USER_AGENT =
  "Mozilla/5.0 (compatible; MasterMarketerBot/1.0; +https://mid.marketing)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const MIN_WORD_COUNT = 50;
const CALLBACK_MAX_RETRIES = 3;
const CALLBACK_RETRY_DELAY_MS = 5_000;

interface ScrapePayload extends BlogScrapeInput {
  _jobId?: string;
}

async function callbackWithRetry(
  callbackUrl: string,
  apiKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  for (let attempt = 1; attempt <= CALLBACK_MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[scrape-blog-url] Callback to ${callbackUrl} (attempt ${attempt}/${CALLBACK_MAX_RETRIES})`
      );
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[scrape-blog-url] Callback delivered successfully`);
        return;
      }

      const text = await response.text().catch(() => "");
      console.warn(
        `[scrape-blog-url] Callback attempt ${attempt} got ${response.status}: ${text}`
      );
    } catch (err) {
      console.warn(
        `[scrape-blog-url] Callback attempt ${attempt} failed:`,
        err instanceof Error ? err.message : err
      );
    }

    if (attempt < CALLBACK_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, CALLBACK_RETRY_DELAY_MS * attempt));
    }
  }

  console.error(
    `[scrape-blog-url] Failed to deliver callback to ${callbackUrl} after ${CALLBACK_MAX_RETRIES} attempts`
  );
}

export const scrapeBlogUrl = task({
  id: "scrape-blog-url",
  maxDuration: 120, // 2 minutes — simple fetch + parse
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: ScrapePayload): Promise<BlogScrapeOutput | null> => {
    const { url, callback_url, _jobId, metadata: inputMetadata } = payload;
    const apiKey = process.env.API_KEY || "";

    try {
      // Step 1: Fetch the URL
      metadata.set("progress", `Fetching ${url}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: controller.signal,
          redirect: "follow",
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        throw new Error(`Non-HTML content type: ${contentType}`);
      }

      const html = await response.text();

      // Step 2-4: Parse HTML, extract article, convert to markdown
      metadata.set("progress", "Extracting article content");

      const article = extractArticle(html, url);

      // Step 5: Validate content
      if (article.word_count < MIN_WORD_COUNT) {
        throw new Error(
          `Content too short (${article.word_count} words, minimum ${MIN_WORD_COUNT}) — likely not a real article`
        );
      }

      const output: BlogScrapeOutput = {
        url,
        title: article.title,
        content_markdown: article.content_markdown,
        published_date: article.published_date,
        author: article.author,
        meta_description: article.meta_description,
        word_count: article.word_count,
      };

      // Step 6: Callback
      if (callback_url) {
        metadata.set("progress", "Delivering results via callback");

        await callbackWithRetry(callback_url, apiKey, {
          job_id: _jobId || "unknown",
          status: "completed",
          metadata: inputMetadata,
          output,
        });
      }

      metadata.set("progress", "Complete");
      return output;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      console.error(`[scrape-blog-url] Failed for ${url}: ${errorMessage}`);

      // Callback with failure
      if (callback_url) {
        metadata.set("progress", "Delivering failure callback");

        await callbackWithRetry(callback_url, apiKey, {
          job_id: _jobId || "unknown",
          status: "failed",
          metadata: inputMetadata,
          error: `Failed to scrape ${url}: ${errorMessage}`,
        });
      }

      metadata.set("progress", "Failed");
      return null;
    }
  },
});

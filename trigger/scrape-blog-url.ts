import { task, metadata } from "@trigger.dev/sdk/v3";
import Firecrawl from "@mendable/firecrawl-js";
import TurndownService from "turndown";
import { BlogScrapeInput } from "../src/types/blog-scrape-input";
import { BlogScrapeOutput } from "../src/types/blog-scrape-output";
import { extractArticle, ExtractedArticle } from "../src/lib/html-to-markdown";
import { extractYouTubeContent } from "../src/lib/youtube-extract";

// YouTube URL detection
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const USER_AGENT =
  "Mozilla/5.0 (compatible; MasterMarketerBot/1.0; +https://mid.marketing)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const MIN_WORD_COUNT = 50;
const CALLBACK_MAX_RETRIES = 3;
const CALLBACK_RETRY_DELAY_MS = 5_000;

interface ScrapePayload extends BlogScrapeInput {
  _jobId?: string;
  _apiKey?: string;
  _apifyApiKey?: string;
  _youtubeApiKey?: string;
}

/**
 * Scrape a URL via Firecrawl (renders JavaScript).
 * Used as a fallback when plain fetch returns too little content,
 * which typically means the site is a client-rendered SPA.
 */
async function scrapeViaFirecrawl(
  url: string,
  apiKey: string
): Promise<ExtractedArticle> {
  const client = new Firecrawl({ apiKey });
  const result = await client.scrape(url, {
    formats: ["markdown", "html"],
  });

  const r = result as {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      ogTitle?: string;
      description?: string;
      ogDescription?: string;
      author?: string;
      publishedTime?: string;
      "article:published_time"?: string;
    };
  };

  let markdown = r.markdown || "";

  // If Firecrawl returned HTML but no markdown, convert it ourselves.
  if (!markdown && r.html) {
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
    markdown = turndown.turndown(r.html);
  }

  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  const wordCount = markdown.split(/\s+/).filter((w) => w.length > 0).length;

  const meta = r.metadata || {};
  const title = meta.title || meta.ogTitle || url;
  const metaDescription = meta.description || meta.ogDescription || undefined;
  const author = meta.author || undefined;

  const rawDate = meta.publishedTime || meta["article:published_time"];
  let publishedDate: string | undefined;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      publishedDate = d.toISOString().slice(0, 10);
    }
  }

  return {
    title,
    content_markdown: markdown,
    author,
    published_date: publishedDate,
    meta_description: metaDescription,
    word_count: wordCount,
  };
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
    const { url, callback_url, _jobId, _apiKey, _apifyApiKey, _youtubeApiKey, metadata: inputMetadata } = payload;
    const apiKey = _apiKey || process.env.API_KEY || "";
    const apifyApiKey = _apifyApiKey || process.env.APIFY_API_KEY || "";
    const youtubeApiKey = _youtubeApiKey || process.env.YOUTUBE_API_KEY || "";

    try {
      // YouTube detection — extract transcript instead of scraping HTML
      const youtubeMatch = url.match(YOUTUBE_REGEX);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];

        if (!apifyApiKey) {
          throw new Error("APIFY_API_KEY is required for YouTube transcript extraction");
        }

        metadata.set("progress", `Extracting YouTube transcript for ${videoId}`);

        const output = await extractYouTubeContent(videoId, url, apifyApiKey, youtubeApiKey || undefined);

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
      }

      // Step 1: Fetch the URL
      metadata.set("progress", `Fetching ${url}`);

      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      let article: ExtractedArticle | null = null;
      let fetchError: string | null = null;

      try {
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

        metadata.set("progress", "Extracting article content");
        article = extractArticle(html, url);
      } catch (err) {
        fetchError = err instanceof Error ? err.message : String(err);
        console.warn(`[scrape-blog-url] Direct fetch failed for ${url}: ${fetchError}`);
      }

      // Fallback to Firecrawl when direct fetch produced too little content
      // (likely a client-rendered SPA) or failed outright.
      if ((!article || article.word_count < MIN_WORD_COUNT) && firecrawlApiKey) {
        const reason = article
          ? `only ${article.word_count} words from direct fetch`
          : `direct fetch failed (${fetchError})`;
        console.log(`[scrape-blog-url] Falling back to Firecrawl for ${url} — ${reason}`);
        metadata.set("progress", "Rendering page via Firecrawl");

        try {
          article = await scrapeViaFirecrawl(url, firecrawlApiKey);
        } catch (err) {
          const fcError = err instanceof Error ? err.message : String(err);
          console.warn(`[scrape-blog-url] Firecrawl fallback failed for ${url}: ${fcError}`);
          // Keep prior `article` (may still be the short one) so the validation below reports word count.
        }
      }

      if (!article) {
        throw new Error(fetchError || "Failed to fetch URL");
      }

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

import { ApifyClient } from "apify-client";

export interface YouTubeResult {
  url: string;
  title: string;
  content_markdown: string;
  published_date?: string;
  author?: string;
  meta_description?: string;
  word_count?: number;
  video_id?: string;
  duration_seconds?: number;
  source_type?: string;
}

const APIFY_MAX_RETRIES = 5;
const APIFY_RETRY_DELAY_MS = 5_000;

/**
 * Call Apify transcript actor and extract caption strings.
 * Returns null if the actor returns no captions (transient YouTube flake).
 */
async function fetchTranscriptFromApify(
  client: ApifyClient,
  videoUrl: string,
  videoId: string
): Promise<{ captionStrings: string[]; item: Record<string, unknown> } | null> {
  const run = await client
    .actor("karamelo/youtube-transcripts")
    .call(
      {
        urls: [videoUrl],
        outputFormat: "captions",
      },
      { timeout: 120 }
    );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const item = items[0] as Record<string, unknown> | undefined;

  if (!item) return null;

  // Log output for debugging
  console.log(`[youtube-extract] Apify response keys for ${videoId}:`, Object.keys(item));
  console.log(`[youtube-extract] Apify raw data sizes:`, {
    captions: Array.isArray(item.captions) ? (item.captions as unknown[]).length : 0,
    transcript: Array.isArray(item.transcript) ? (item.transcript as unknown[]).length : 0,
    subtitles: Array.isArray(item.subtitles) ? (item.subtitles as unknown[]).length : 0,
    transcriptText: typeof item.transcriptText === "string" ? (item.transcriptText as string).length : 0,
    text: typeof item.text === "string" ? (item.text as string).length : 0,
  });

  // Find the captions array — actor returns { captions: string[] }
  let captionStrings: string[] = [];
  const arrayFieldNames = ["captions", "transcript", "subtitles"];
  for (const field of arrayFieldNames) {
    if (Array.isArray(item[field]) && (item[field] as unknown[]).length > 0) {
      const arr = item[field] as unknown[];
      console.log(`[youtube-extract] Found array in field "${field}" with ${arr.length} items, first item type: ${typeof arr[0]}`);

      if (typeof arr[0] === "string") {
        captionStrings = arr as string[];
      } else if (typeof arr[0] === "object" && arr[0] !== null) {
        for (const obj of arr as Record<string, unknown>[]) {
          const text = (obj.text ?? obj.content ?? obj.line ?? obj.value ?? obj.caption) as string | undefined;
          if (typeof text === "string" && text.trim()) {
            captionStrings.push(text.trim());
          }
        }
      }
      break;
    }
  }

  console.log(`[youtube-extract] Extracted ${captionStrings.length} caption strings`);

  if (captionStrings.length === 0) return null;

  return { captionStrings, item };
}

/**
 * Extract YouTube video transcript and metadata via Apify.
 * Uses Apify to avoid YouTube captcha/rate-limit blocks from datacenter IPs.
 * Retries up to 3 times — YouTube's caption API intermittently returns empty
 * results under concurrent load from datacenter IPs.
 */
export async function extractYouTubeContent(
  videoId: string,
  url: string,
  apifyApiKey: string,
  youtubeApiKey?: string
): Promise<YouTubeResult> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 1. Fetch transcript via Apify actor (with retries for transient failures)
  const client = new ApifyClient({ token: apifyApiKey });

  let result: { captionStrings: string[]; item: Record<string, unknown> } | null = null;

  for (let attempt = 1; attempt <= APIFY_MAX_RETRIES; attempt++) {
    try {
      result = await fetchTranscriptFromApify(client, videoUrl, videoId);
    } catch (err) {
      console.warn(
        `[youtube-extract] Apify attempt ${attempt}/${APIFY_MAX_RETRIES} threw for ${videoId}:`,
        err instanceof Error ? err.message : err
      );
    }

    if (result) break;

    if (attempt < APIFY_MAX_RETRIES) {
      console.log(
        `[youtube-extract] No captions on attempt ${attempt}/${APIFY_MAX_RETRIES} for ${videoId}, retrying in ${APIFY_RETRY_DELAY_MS * attempt}ms...`
      );
      await new Promise((r) => setTimeout(r, APIFY_RETRY_DELAY_MS * attempt));
    }
  }

  if (!result) {
    throw new Error(
      "No transcript available for this video after 3 attempts. The video may not have captions enabled, or YouTube's caption API is temporarily unavailable."
    );
  }

  const { captionStrings, item } = result;

  // Extract metadata
  const title =
    (item.title as string) ||
    (item.videoTitle as string) ||
    `YouTube Video ${videoId}`;
  const author =
    (item.author as string) ||
    (item.channelName as string) ||
    (item.channel as string) ||
    undefined;
  const publishedDate =
    (item.publishedDate as string) ||
    (item.uploadDate as string) ||
    (item.published_date as string) ||
    undefined;

  // 2. Fetch additional metadata via YouTube Data API + oEmbed — best-effort, parallel
  let oembedTitle: string | undefined;
  let oembedAuthor: string | undefined;
  let apiPublishedDate: string | undefined;

  const metadataPromises = [
    // oEmbed for title + author
    (async () => {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${videoUrl}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        if (oembedResponse.ok) {
          const oembed = (await oembedResponse.json()) as { title?: string; author_name?: string };
          oembedTitle = oembed.title;
          oembedAuthor = oembed.author_name;
        }
      } catch {
        // best-effort
      }
    })(),
    // YouTube Data API v3 for publishedAt
    (async () => {
      if (!youtubeApiKey) {
        console.log(`[youtube-extract] No YOUTUBE_API_KEY — skipping Data API call for publish date`);
        return;
      }
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?` +
          new URLSearchParams({
            part: "snippet",
            id: videoId,
            key: youtubeApiKey,
          });
        const apiResponse = await fetch(apiUrl);
        if (apiResponse.ok) {
          const data = (await apiResponse.json()) as {
            items?: { snippet?: { publishedAt?: string } }[];
          };
          apiPublishedDate = data.items?.[0]?.snippet?.publishedAt;
          console.log(`[youtube-extract] YouTube Data API publishedAt: ${apiPublishedDate}`);
        } else {
          console.warn(`[youtube-extract] YouTube Data API returned ${apiResponse.status}`);
        }
      } catch (err) {
        console.warn(`[youtube-extract] YouTube Data API failed:`, err instanceof Error ? err.message : err);
      }
    })(),
  ];

  await Promise.allSettled(metadataPromises);

  const finalTitle = title !== `YouTube Video ${videoId}` ? title : (oembedTitle || title);
  const finalAuthor = author || oembedAuthor;

  // 3. Format transcript as markdown
  let markdown = `# ${finalTitle}\n\n`;
  markdown += `*Video transcript — [Watch on YouTube](${videoUrl})*\n\n`;
  markdown += "---\n\n";

  // No timestamps from this actor, so group ~10 captions per paragraph
  const CAPTIONS_PER_PARAGRAPH = 10;
  for (let i = 0; i < captionStrings.length; i += CAPTIONS_PER_PARAGRAPH) {
    const chunk = captionStrings.slice(i, i + CAPTIONS_PER_PARAGRAPH);
    markdown += chunk.join(" ") + "\n\n";
  }

  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  // Normalize published date (Apify actor > page meta tag)
  const rawDate = publishedDate || apiPublishedDate;
  let normalizedDate: string | undefined;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        normalizedDate = d.toISOString().slice(0, 10);
      }
    } catch {
      // ignore
    }
  }

  console.log(`[youtube-extract] Final output for ${videoId}:`, {
    captionCount: captionStrings.length,
    markdownLength: markdown.length,
    wordCount,
  });

  return {
    url,
    title: finalTitle,
    content_markdown: markdown.trim(),
    published_date: normalizedDate,
    author: finalAuthor,
    meta_description: `Transcript of "${finalTitle}" on YouTube`,
    word_count: wordCount,
    video_id: videoId,
    source_type: "youtube",
  };
}

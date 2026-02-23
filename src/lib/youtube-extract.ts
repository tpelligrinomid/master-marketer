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

interface TranscriptItem {
  text?: string;
  start?: number;
  offset?: number;
  duration?: number;
}

const PARAGRAPH_INTERVAL = 60; // seconds

/**
 * Extract YouTube video transcript and metadata via Apify.
 * Uses Apify to avoid YouTube captcha/rate-limit blocks from datacenter IPs.
 */
export async function extractYouTubeContent(
  videoId: string,
  url: string,
  apifyApiKey: string
): Promise<YouTubeResult> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 1. Fetch transcript via Apify actor
  const client = new ApifyClient({ token: apifyApiKey });

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

  if (!item) {
    throw new Error(
      "No transcript available for this video. The video may not have captions enabled."
    );
  }

  // Log output for debugging
  console.log(`[youtube-extract] Apify response keys for ${videoId}:`, Object.keys(item));
  console.log(`[youtube-extract] Apify raw data sizes:`, {
    captions: Array.isArray(item.captions) ? (item.captions as unknown[]).length : 0,
    transcript: Array.isArray(item.transcript) ? (item.transcript as unknown[]).length : 0,
    subtitles: Array.isArray(item.subtitles) ? (item.subtitles as unknown[]).length : 0,
    transcriptText: typeof item.transcriptText === "string" ? (item.transcriptText as string).length : 0,
    text: typeof item.text === "string" ? (item.text as string).length : 0,
  });

  // Extract transcript — handle common field names from Apify actors
  let transcriptItems: TranscriptItem[] = [];

  if (Array.isArray(item.captions)) {
    transcriptItems = item.captions as TranscriptItem[];
  } else if (Array.isArray(item.transcript)) {
    transcriptItems = item.transcript as TranscriptItem[];
  } else if (Array.isArray(item.subtitles)) {
    transcriptItems = item.subtitles as TranscriptItem[];
  }

  // Extract plain text fallback if no structured captions
  let plainTranscript: string | undefined;
  if (transcriptItems.length === 0) {
    plainTranscript =
      (item.transcriptText as string) ||
      (item.transcript_text as string) ||
      (item.text as string) ||
      (item.content as string) ||
      undefined;

    if (!plainTranscript) {
      throw new Error(
        "No transcript available for this video. The video may not have captions enabled."
      );
    }
  }

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

  // 2. Fetch additional metadata (oEmbed + page HTML for publish date) — best-effort, parallel
  let oembedTitle: string | undefined;
  let oembedAuthor: string | undefined;
  let pagePublishedDate: string | undefined;

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
    // YouTube page HTML for datePublished meta tag
    (async () => {
      try {
        const pageResponse = await fetch(videoUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; MasterMarketerBot/1.0)" },
        });
        if (pageResponse.ok) {
          const html = await pageResponse.text();
          // <meta itemprop="datePublished" content="2024-08-06">
          const dateMatch = html.match(/itemprop="datePublished"\s+content="([^"]+)"/);
          if (dateMatch) {
            pagePublishedDate = dateMatch[1];
          }
          // Fallback: <meta property="og:video:release_date" content="...">
          if (!pagePublishedDate) {
            const ogMatch = html.match(/property="og:video:release_date"\s+content="([^"]+)"/);
            if (ogMatch) {
              pagePublishedDate = ogMatch[1];
            }
          }
        }
      } catch {
        // best-effort
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

  if (transcriptItems.length > 0) {
    // Structured captions — group into paragraphs every ~60 seconds
    let currentParagraph: string[] = [];
    let lastTimestamp = 0;

    for (const segment of transcriptItems) {
      const text = segment.text?.trim();
      if (!text) continue;

      const seconds = Math.floor((segment.start ?? segment.offset ?? 0));

      if (seconds - lastTimestamp >= PARAGRAPH_INTERVAL && currentParagraph.length > 0) {
        const mins = Math.floor(lastTimestamp / 60);
        const secs = lastTimestamp % 60;
        const timestamp = `${mins}:${secs.toString().padStart(2, "0")}`;
        markdown += `**[${timestamp}]** ${currentParagraph.join(" ")}\n\n`;
        currentParagraph = [];
        lastTimestamp = seconds;
      }

      if (currentParagraph.length === 0) {
        lastTimestamp = seconds;
      }

      currentParagraph.push(text);
    }

    // Flush remaining
    if (currentParagraph.length > 0) {
      const mins = Math.floor(lastTimestamp / 60);
      const secs = lastTimestamp % 60;
      const timestamp = `${mins}:${secs.toString().padStart(2, "0")}`;
      markdown += `**[${timestamp}]** ${currentParagraph.join(" ")}\n\n`;
    }
  } else if (plainTranscript) {
    // Plain text fallback — just include as-is
    markdown += plainTranscript + "\n\n";
  }

  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  // Calculate duration from last transcript item
  let durationSeconds: number | undefined;
  if (transcriptItems.length > 0) {
    const lastSegment = transcriptItems[transcriptItems.length - 1];
    const start = lastSegment.start ?? lastSegment.offset ?? 0;
    durationSeconds = Math.ceil(start + (lastSegment.duration ?? 0));
  }

  // Normalize published date (Apify actor > page meta tag)
  const rawDate = publishedDate || pagePublishedDate;
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
    transcriptItemsProcessed: transcriptItems.length,
    markdownLength: markdown.length,
    wordCount,
    durationSeconds,
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
    duration_seconds: durationSeconds,
    source_type: "youtube",
  };
}

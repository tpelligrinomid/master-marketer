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

  // Find the captions array — actor returns { captions: string[] }
  let captionStrings: string[] = [];
  const arrayFieldNames = ["captions", "transcript", "subtitles"];
  for (const field of arrayFieldNames) {
    if (Array.isArray(item[field]) && (item[field] as unknown[]).length > 0) {
      const arr = item[field] as unknown[];
      console.log(`[youtube-extract] Found array in field "${field}" with ${arr.length} items, first item type: ${typeof arr[0]}`);

      if (typeof arr[0] === "string") {
        // Plain string array (karamelo/youtube-transcripts format)
        captionStrings = arr as string[];
      } else if (typeof arr[0] === "object" && arr[0] !== null) {
        // Object array — extract text from each item
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

  if (captionStrings.length === 0) {
    // Dump the full response so we can debug
    console.error(`[youtube-extract] Could not find transcript in Apify response. Full response:`,
      JSON.stringify(item).slice(0, 2000));
    throw new Error(
      "No transcript available for this video. The video may not have captions enabled."
    );
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

  // No timestamps from this actor, so group ~10 captions per paragraph
  const CAPTIONS_PER_PARAGRAPH = 10;
  for (let i = 0; i < captionStrings.length; i += CAPTIONS_PER_PARAGRAPH) {
    const chunk = captionStrings.slice(i, i + CAPTIONS_PER_PARAGRAPH);
    markdown += chunk.join(" ") + "\n\n";
  }

  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

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

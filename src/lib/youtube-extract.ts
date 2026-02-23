import { YoutubeTranscript } from "youtube-transcript";

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

const PARAGRAPH_INTERVAL = 60; // seconds

export async function extractYouTubeContent(
  videoId: string,
  url: string
): Promise<YouTubeResult> {
  // 1. Fetch transcript
  const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

  if (!transcriptItems || transcriptItems.length === 0) {
    throw new Error(
      "No transcript available for this video. The video may not have captions enabled."
    );
  }

  // 2. Fetch video metadata via oEmbed (no API key needed)
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  let title = `YouTube Video ${videoId}`;
  let author: string | undefined;

  try {
    const oembedResponse = await fetch(oembedUrl);
    if (oembedResponse.ok) {
      const oembed = (await oembedResponse.json()) as { title?: string; author_name?: string };
      title = oembed.title || title;
      author = oembed.author_name;
    }
  } catch {
    // oEmbed is best-effort — transcript is the important part
  }

  // 3. Format transcript as markdown
  let markdown = `# ${title}\n\n`;
  markdown += `*Video transcript — [Watch on YouTube](https://www.youtube.com/watch?v=${videoId})*\n\n`;
  markdown += "---\n\n";

  // Group transcript into paragraphs (every ~60 seconds)
  let currentParagraph: string[] = [];
  let lastTimestamp = 0;

  for (const item of transcriptItems) {
    const seconds = Math.floor(item.offset / 1000);

    // Start a new paragraph every ~60 seconds
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

    currentParagraph.push(item.text.trim());
  }

  // Flush remaining paragraph
  if (currentParagraph.length > 0) {
    const mins = Math.floor(lastTimestamp / 60);
    const secs = lastTimestamp % 60;
    const timestamp = `${mins}:${secs.toString().padStart(2, "0")}`;
    markdown += `**[${timestamp}]** ${currentParagraph.join(" ")}\n\n`;
  }

  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  // Calculate total duration from last transcript item
  const lastItem = transcriptItems[transcriptItems.length - 1];
  const durationSeconds = lastItem
    ? Math.ceil((lastItem.offset + (lastItem.duration || 0)) / 1000)
    : undefined;

  return {
    url,
    title,
    content_markdown: markdown.trim(),
    author,
    meta_description: `Transcript of "${title}" on YouTube`,
    word_count: wordCount,
    video_id: videoId,
    duration_seconds: durationSeconds,
    source_type: "youtube",
  };
}

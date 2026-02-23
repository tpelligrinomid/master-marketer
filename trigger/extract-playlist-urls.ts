import { task, metadata } from "@trigger.dev/sdk/v3";
import { PlaylistExtractInput } from "../src/types/playlist-extract-input";
import {
  PlaylistExtractOutput,
  PlaylistVideo,
} from "../src/types/playlist-extract-output";

const CALLBACK_MAX_RETRIES = 3;
const CALLBACK_RETRY_DELAY_MS = 5_000;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Parse ISO 8601 duration (e.g. "PT1M30S", "PT5S", "PT1H2M") to seconds.
 */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

const SHORTS_MAX_SECONDS = 60;

interface ExtractPayload extends PlaylistExtractInput {
  _jobId?: string;
  _apiKey?: string;
  _youtubeApiKey?: string;
}

/**
 * Extract playlist ID from a URL or raw ID string.
 * Supports: full URL with ?list=..., shortened URLs, or bare playlist ID.
 */
function parsePlaylistId(input: string): string {
  // Try to extract from URL query param
  try {
    const url = new URL(input);
    const list = url.searchParams.get("list");
    if (list) return list;
  } catch {
    // Not a URL — treat as raw playlist ID
  }

  // If it looks like a playlist ID already (starts with PL, UU, OL, etc.)
  if (/^[A-Za-z0-9_-]{10,}$/.test(input.trim())) {
    return input.trim();
  }

  throw new Error(
    `Could not extract playlist ID from: ${input}. Provide a YouTube playlist URL or ID.`
  );
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
        `[extract-playlist-urls] Callback to ${callbackUrl} (attempt ${attempt}/${CALLBACK_MAX_RETRIES})`
      );
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(
          `[extract-playlist-urls] Callback delivered successfully`
        );
        return;
      }

      const text = await response.text().catch(() => "");
      console.warn(
        `[extract-playlist-urls] Callback attempt ${attempt} got ${response.status}: ${text}`
      );
    } catch (err) {
      console.warn(
        `[extract-playlist-urls] Callback attempt ${attempt} failed:`,
        err instanceof Error ? err.message : err
      );
    }

    if (attempt < CALLBACK_MAX_RETRIES) {
      await new Promise((r) =>
        setTimeout(r, CALLBACK_RETRY_DELAY_MS * attempt)
      );
    }
  }

  console.error(
    `[extract-playlist-urls] Failed to deliver callback to ${callbackUrl} after ${CALLBACK_MAX_RETRIES} attempts`
  );
}

export const extractPlaylistUrls = task({
  id: "extract-playlist-urls",
  maxDuration: 60,
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: ExtractPayload
  ): Promise<PlaylistExtractOutput | null> => {
    const {
      playlist_url,
      callback_url,
      _jobId,
      _apiKey,
      _youtubeApiKey,
      metadata: inputMetadata,
    } = payload;
    const apiKey = _apiKey || process.env.API_KEY || "";
    const youtubeApiKey =
      _youtubeApiKey || process.env.YOUTUBE_API_KEY || "";

    try {
      if (!youtubeApiKey) {
        throw new Error(
          "YOUTUBE_API_KEY is required for playlist extraction"
        );
      }

      const playlistId = parsePlaylistId(playlist_url);
      metadata.set(
        "progress",
        `Extracting videos from playlist ${playlistId}`
      );

      // Fetch playlist title
      const playlistRes = await fetch(
        `${YT_API_BASE}/playlists?part=snippet&id=${playlistId}&key=${youtubeApiKey}`
      );
      if (!playlistRes.ok) {
        throw new Error(
          `YouTube API error fetching playlist: ${playlistRes.status} ${playlistRes.statusText}`
        );
      }
      const playlistData: any = await playlistRes.json();
      const playlistTitle =
        playlistData.items?.[0]?.snippet?.title || "Unknown Playlist";

      // Paginate through playlistItems
      const videos: PlaylistVideo[] = [];
      let pageToken: string | undefined;

      do {
        const params = new URLSearchParams({
          part: "snippet",
          playlistId,
          maxResults: "50",
          key: youtubeApiKey,
        });
        if (pageToken) params.set("pageToken", pageToken);

        const res = await fetch(
          `${YT_API_BASE}/playlistItems?${params.toString()}`
        );
        if (!res.ok) {
          throw new Error(
            `YouTube API error fetching playlist items: ${res.status} ${res.statusText}`
          );
        }

        const data: any = await res.json();

        for (const item of data.items || []) {
          const videoId = item.snippet?.resourceId?.videoId;
          if (!videoId) continue;

          videos.push({
            video_id: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title: item.snippet?.title || "",
            published_at: item.snippet?.publishedAt || undefined,
            position: item.snippet?.position ?? videos.length,
          });
        }

        metadata.set(
          "progress",
          `Fetched ${videos.length} videos so far...`
        );
        pageToken = data.nextPageToken;
      } while (pageToken);

      // Fetch durations in batches of 50 via videos endpoint
      metadata.set("progress", "Fetching video durations...");
      for (let i = 0; i < videos.length; i += 50) {
        const batch = videos.slice(i, i + 50);
        const ids = batch.map((v) => v.video_id).join(",");
        const durationRes = await fetch(
          `${YT_API_BASE}/videos?part=contentDetails&id=${ids}&key=${youtubeApiKey}`
        );
        if (durationRes.ok) {
          const durationData: any = await durationRes.json();
          const durationMap = new Map<string, number>();
          for (const item of durationData.items || []) {
            const dur = parseDuration(item.contentDetails?.duration || "");
            durationMap.set(item.id, dur);
          }
          for (const video of batch) {
            const dur = durationMap.get(video.video_id);
            if (dur !== undefined) {
              video.duration_seconds = dur;
              video.is_short = dur <= SHORTS_MAX_SECONDS;
            }
          }
        }
      }

      const output: PlaylistExtractOutput = {
        playlist_id: playlistId,
        playlist_title: playlistTitle,
        video_count: videos.length,
        videos,
      };

      console.log(
        `[extract-playlist-urls] Extracted ${videos.length} videos from playlist "${playlistTitle}"`
      );

      // Callback
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
      console.error(
        `[extract-playlist-urls] Failed for ${playlist_url}: ${errorMessage}`
      );

      if (callback_url) {
        metadata.set("progress", "Delivering failure callback");

        await callbackWithRetry(callback_url, apiKey, {
          job_id: _jobId || "unknown",
          status: "failed",
          metadata: inputMetadata,
          error: `Failed to extract playlist: ${errorMessage}`,
        });
      }

      metadata.set("progress", "Failed");
      return null;
    }
  },
});

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

interface PlaylistVideo {
  video_id: string;
  url: string;
  title: string;
  published_at: string;
  position: number;
  duration_seconds?: number;
  is_short?: boolean;
}

const SHORTS_MAX_SECONDS = 60;

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function parsePlaylistId(input: string): string {
  try {
    const url = new URL(input);
    const list = url.searchParams.get("list");
    if (list) return list;
  } catch {
    // Not a URL
  }

  if (/^[A-Za-z0-9_-]{10,}$/.test(input.trim())) {
    return input.trim();
  }

  throw new Error(`Could not extract playlist ID from: ${input}`);
}

async function extractPlaylist(playlistId: string, apiKey: string) {
  // Fetch playlist title
  const playlistRes = await fetch(
    `${YT_API_BASE}/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
  );
  if (!playlistRes.ok) {
    throw new Error(`YouTube API error: ${playlistRes.status} ${playlistRes.statusText}`);
  }
  const playlistData = await playlistRes.json();
  const playlistTitle = playlistData.items?.[0]?.snippet?.title || "Unknown";

  // Paginate through items
  const videos: PlaylistVideo[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId,
      maxResults: "50",
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${YT_API_BASE}/playlistItems?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    for (const item of data.items || []) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      videos.push({
        video_id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: item.snippet?.title || "",
        published_at: item.snippet?.publishedAt || "",
        position: item.snippet?.position ?? videos.length,
      });
    }

    console.log(`  Fetched ${videos.length} videos so far...`);
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Fetch durations in batches of 50
  console.log("  Fetching video durations...");
  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    const ids = batch.map((v) => v.video_id).join(",");
    const durationRes = await fetch(
      `${YT_API_BASE}/videos?part=contentDetails&id=${ids}&key=${apiKey}`
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

  return { playlistTitle, videos };
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npx tsx scripts/extract-playlist.ts <playlist_url_or_id>");
    process.exit(1);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("YOUTUBE_API_KEY not set in .env");
    process.exit(1);
  }

  const playlistId = parsePlaylistId(input);
  console.log(`Extracting playlist: ${playlistId}`);

  const { playlistTitle, videos } = await extractPlaylist(playlistId, apiKey);

  const shorts = videos.filter((v) => v.is_short);
  const fullVideos = videos.filter((v) => !v.is_short);
  console.log(`\nPlaylist: "${playlistTitle}" — ${videos.length} videos (${fullVideos.length} full, ${shorts.length} shorts)`);

  // Build CSV
  const header = "position,video_id,url,title,published_at,duration_seconds,is_short";
  const rows = videos.map(
    (v) =>
      `${v.position},${v.video_id},${v.url},${escapeCsv(v.title)},${v.published_at},${v.duration_seconds ?? ""},${v.is_short ?? ""}`
  );
  const csv = [header, ...rows].join("\n");

  // Write to docs/
  const safeTitle = playlistTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase();
  const filename = `playlist-${safeTitle}-${playlistId.slice(0, 12)}.csv`;
  const outPath = path.join(process.cwd(), "docs", filename);

  fs.writeFileSync(outPath, csv, "utf-8");
  console.log(`\nCSV written to: ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

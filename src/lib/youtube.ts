import {
  YouTubeChannelData,
  YouTubeVideo,
} from "../types/research-intelligence";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Fetch YouTube channel stats + recent videos via YouTube Data API v3.
 */
export async function getYouTubeChannelData(
  channelId: string,
  apiKey: string,
  maxVideos: number = 25
): Promise<YouTubeChannelData> {
  // Step 1: Get channel info
  const channelResponse = await fetch(
    `${YT_API_BASE}/channels?` +
      new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: channelId,
        key: apiKey,
      })
  );

  if (!channelResponse.ok) {
    throw new Error(
      `YouTube API error (${channelResponse.status}): ${await channelResponse.text()}`
    );
  }

  interface YTChannelItem {
    snippet?: {
      title?: string;
      description?: string;
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }

  const channelData = (await channelResponse.json()) as {
    items?: YTChannelItem[];
  };

  const channel = channelData.items?.[0];
  if (!channel) {
    return { channel_id: channelId, recent_videos: [] };
  }

  const uploadsPlaylistId =
    channel.contentDetails?.relatedPlaylists?.uploads;

  // Step 2: Get recent videos from uploads playlist
  const recentVideos: YouTubeVideo[] = [];

  if (uploadsPlaylistId) {
    const playlistResponse = await fetch(
      `${YT_API_BASE}/playlistItems?` +
        new URLSearchParams({
          part: "snippet,contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: String(maxVideos),
          key: apiKey,
        })
    );

    if (playlistResponse.ok) {
      interface YTPlaylistItem {
        snippet?: {
          title?: string;
          description?: string;
          publishedAt?: string;
        };
        contentDetails?: {
          videoId?: string;
        };
      }

      const playlistData = (await playlistResponse.json()) as {
        items?: YTPlaylistItem[];
      };

      const videoIds = (playlistData.items || [])
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => !!id);

      // Step 3: Get detailed stats for each video
      if (videoIds.length > 0) {
        const videosResponse = await fetch(
          `${YT_API_BASE}/videos?` +
            new URLSearchParams({
              part: "snippet,statistics,contentDetails",
              id: videoIds.join(","),
              key: apiKey,
            })
        );

        if (videosResponse.ok) {
          interface YTVideoItem {
            id?: string;
            snippet?: {
              title?: string;
              description?: string;
              publishedAt?: string;
              tags?: string[];
            };
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
            contentDetails?: {
              duration?: string;
            };
          }

          const videosData = (await videosResponse.json()) as {
            items?: YTVideoItem[];
          };

          for (const video of videosData.items || []) {
            recentVideos.push({
              video_id: video.id || "",
              title: video.snippet?.title || "",
              description: video.snippet?.description?.slice(0, 500),
              published_at: video.snippet?.publishedAt,
              view_count: video.statistics?.viewCount
                ? parseInt(video.statistics.viewCount, 10)
                : undefined,
              like_count: video.statistics?.likeCount
                ? parseInt(video.statistics.likeCount, 10)
                : undefined,
              comment_count: video.statistics?.commentCount
                ? parseInt(video.statistics.commentCount, 10)
                : undefined,
              duration: video.contentDetails?.duration,
              tags: video.snippet?.tags?.slice(0, 10),
            });
          }
        }
      }
    }
  }

  return {
    channel_id: channelId,
    title: channel.snippet?.title,
    description: channel.snippet?.description?.slice(0, 500),
    subscriber_count: channel.statistics?.subscriberCount
      ? parseInt(channel.statistics.subscriberCount, 10)
      : undefined,
    video_count: channel.statistics?.videoCount
      ? parseInt(channel.statistics.videoCount, 10)
      : undefined,
    view_count: channel.statistics?.viewCount
      ? parseInt(channel.statistics.viewCount, 10)
      : undefined,
    recent_videos: recentVideos,
  };
}

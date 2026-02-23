export interface PlaylistVideo {
  video_id: string;
  url: string;
  title: string;
  published_at?: string;
  position: number;
  duration_seconds?: number;
  is_short?: boolean;
}

export interface PlaylistExtractOutput {
  playlist_id: string;
  playlist_title: string;
  video_count: number;
  videos: PlaylistVideo[];
}

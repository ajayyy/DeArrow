import { ChannelID } from "../../maze-utils/src/video";
import { VideoID } from "../../maze-utils/src/video";
import { DataCache } from "../utils/cache";

export interface PlaybackUrl {
    url: string;
    width: number;
    height: number;
}

interface ThumbnailVideoBase {
    video: HTMLVideoElement | null;
    width: number;
    height: number;
    onReady: Array<(video: RenderedThumbnailVideo | null) => void>;
    timestamp: number;
}

export type RenderedThumbnailVideo = ThumbnailVideoBase & {
    blob: Blob;
    rendered: true;
    fromThumbnailCache: boolean;
}

export type ThumbnailVideo = RenderedThumbnailVideo | ThumbnailVideoBase & {
    rendered: false;
};

export interface FailInfo {
    timestamp: number;
    onReady: Array<(video: RenderedThumbnailVideo | null) => void>;
}

interface VideoMetadata {
    playbackUrls: PlaybackUrl[];
    duration: number | null;
    channelID: ChannelID | null;
    author: string | null;
    isLive: boolean | null;
    isUpcoming: boolean | null;
}

export interface ThumbnailData {
    video: ThumbnailVideo[];
    metadata: VideoMetadata;
    failures: FailInfo[];
    thumbnailCachesFailed: Set<number>;
}

export const thumbnailDataCache = new DataCache<VideoID, ThumbnailData>(() => ({
    video: [],
    metadata: {
        playbackUrls: [],
        duration: null,
        channelID: null,
        author: null,
        isLive: false,
        isUpcoming: false
    },
    failures: [],
    thumbnailCachesFailed: new Set()
}));

export interface ChannelData {
    avatarUrl: string | null;
}

export const channelInfoCache = new DataCache<ChannelID, ChannelData>(() => ({
    avatarUrl: null
}));
import { ChannelID } from "../../maze-utils/src/video";
import { VideoID } from "../../maze-utils/src/video";
import { DataCache } from "../../maze-utils/src/cache";

interface ThumbnailVideoBase {
    video: HTMLVideoElement | null;
    width: number;
    height: number;
    onReady: Array<(video: RenderedThumbnailVideo | null) => void>;
    timestamp: number;
}

export type RenderedThumbnailVideo = ThumbnailVideoBase & {
    blobUrl: string;
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

export interface ThumbnailData {
    video: ThumbnailVideo[];
    failures: FailInfo[];
    thumbnailCachesFailed: Set<number>;
}

export const thumbnailDataCache = new DataCache<VideoID, ThumbnailData>(() => ({
    video: [],
    failures: [],
    thumbnailCachesFailed: new Set()
}), (e) => {
    for (const video of e.video) {
        if (video.rendered) {
            URL.revokeObjectURL(video.blobUrl);
        }
    }
}, 1000);

export interface ChannelData {
    avatarUrl: string | null;
}

export const channelInfoCache = new DataCache<ChannelID, ChannelData>(() => ({
    avatarUrl: null
}));
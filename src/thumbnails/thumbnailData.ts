import { BrandingUUID } from "../videoBranding/videoBranding";
import { PlaybackUrl, cacheUsed, getFromCache, setupCache } from "./thumbnailDataCache";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { log } from "../utils/logger";

interface PartialThumbnailResult {
    votes: number;
    locked: boolean;
    UUID: BrandingUUID;
}

export type CustomThumbnailSubmission = {
    timestamp: number;
    original: false;
};
export type CustomThumbnailResult = PartialThumbnailResult & CustomThumbnailSubmission;

export type OriginalThumbnailSubmission = {
    original: true;
};
export type OriginalThumbnailResult = PartialThumbnailResult & OriginalThumbnailSubmission;

export type ThumbnailResult = CustomThumbnailResult | OriginalThumbnailResult;
export type ThumbnailSubmission = CustomThumbnailSubmission | OriginalThumbnailSubmission;

export interface Format {
    url: string;
    width: number;
    height: number;
}

const activeRequests: Record<VideoID, Promise<PlaybackUrl[]>> = {};
async function fetchFormats(videoID: VideoID, ignoreCache: boolean): Promise<Format[]> {
    const cachedData = getFromCache(videoID);
    if (!ignoreCache && cachedData?.playbackUrls) {
        return cachedData.playbackUrls;
    }

    const start = Date.now();

    const url = "https://www.youtube.com/youtubei/v1/player";
    const data = {
        context: {
            client: {
                clientName: "WEB",
                clientVersion: "2.20230327.07.00"
            }
        },
        videoId: videoID
    };

    try {
        const result = activeRequests[videoID] ?? (async () => {
            const result = await fetch(url, {
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: "POST"
            });
    
            if (result.ok) {
                type Format = {
                    url: string;
                    width: number;
                    height: number;
                    mimeType: string;
                }
    
                const response = await result.json();
                const formats = response?.streamingData?.adaptiveFormats as Format[];
                if (formats) {
                    const containsVp9 = formats.some((format) => format.mimeType.includes("vp9"));
                    // Should already be reverse sorted, but reverse sort just incase (not slow if it is correct already)
                    const sorted = formats
                        .reverse()
                        .filter((format) => format.width && format.height && (!containsVp9 || format.mimeType.includes("vp9")))
                        .sort((a, b) => a?.width - b?.width);
    
                    log(videoID, (Date.now() - start) / 1000, "innerTube");
                    const videoCache = setupCache(videoID);
                    videoCache.playbackUrls = sorted.map((format) => ({
                        url: format.url,
                        width: format.width,
                        height: format.height
                    }));

                    // Remove this from active requests after it's been dealt with in other places
                    setTimeout(() => delete activeRequests[videoID], 500);

                    return videoCache.playbackUrls;
                }
            }

            return [];
        })();

        activeRequests[videoID] = result;
        return await result;
    } catch (e) { } //eslint-disable-line no-empty

    return [];
}

export async function getPlaybackFormats(videoID: VideoID,
    width?: number, height?: number, ignoreCache = false): Promise<Format | null> {
    const formats = await fetchFormats(videoID, ignoreCache);

    if (width && height) {
        const bestFormat = formats?.find(f => f?.width >= width && f?.height >= height);

        if (bestFormat) {
            cacheUsed(videoID);

            return bestFormat;
        }
    } else if (formats?.length > 0) {
        return formats[0];
    }

    return null;
}
import { BrandingUUID } from "../videoBranding/videoBranding";
import { PlaybackUrl, cacheUsed, getFromCache, setupCache } from "./thumbnailDataCache";
import { VideoID } from "../maze-utils/video";
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

interface InnerTubeFormat {
    url: string;
    width: number;
    height: number;
    mimeType: string;
}

interface InnerTubeMetadataBase {
    duration: number | null;
    channelID: string | null;
    author: string | null;
}

interface InnerTubeMetadata extends InnerTubeMetadataBase {
    formats: InnerTubeFormat[];
}

interface VideoMetadata extends InnerTubeMetadataBase {
    playbackUrls: PlaybackUrl[];
}

export interface ChannelInfo {
    channelID: string | null;
    author: string | null;
}

const activeRequests: Record<VideoID, Promise<VideoMetadata>> = {};
export async function fetchVideoMetadata(videoID: VideoID, ignoreCache: boolean): Promise<VideoMetadata> {
    const cachedData = getFromCache(videoID);
    if (!ignoreCache && cachedData?.metadata) {
        return cachedData.metadata;
    }

    const start = Date.now();

    try {
        const result = activeRequests[videoID] ?? (async () => {
            let metadata = Math.random() > 0.5 ? await fetchVideoDataAndroidClient(videoID) : await fetchVideoDataDesktopClient(videoID);
            if (!metadata || metadata.formats.length === 0) metadata = await fetchVideoDataDesktopClient(videoID);
    
            if (metadata && metadata.formats.length > 0) {
                const formats = metadata.formats;

                const containsVp9 = formats.some((format) => format.mimeType.includes("vp9"));
                // Should already be reverse sorted, but reverse sort just incase (not slow if it is correct already)
                const sorted = formats
                    .reverse()
                    .filter((format) => format.width && format.height && (!containsVp9 || format.mimeType.includes("vp9")))
                    .sort((a, b) => a?.width - b?.width);

                log(videoID, (Date.now() - start) / 1000, "innerTube");
                const videoCache = setupCache(videoID);
                videoCache.metadata.playbackUrls = sorted.map((format) => ({
                    url: format.url,
                    width: format.width,
                    height: format.height
                }));
                videoCache.metadata.duration = metadata.duration;
                videoCache.metadata.channelID = metadata.channelID;
                videoCache.metadata.author = metadata.author;

                // Remove this from active requests after it's been dealt with in other places
                setTimeout(() => delete activeRequests[videoID], 500);

                return videoCache.metadata;
            }

            return [];
        })();

        activeRequests[videoID] = result;
        return await result;
    } catch (e) { } //eslint-disable-line no-empty

    return {
        duration: null,
        channelID: null,
        author: null,
        playbackUrls: []
    };
}

export async function fetchVideoDataAndroidClient(videoID: VideoID): Promise<InnerTubeMetadata> {
    const innertubeDetails = {
        apiKey: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
        clientVersion: "17.31.35",
        clientName: "3",
        androidVersion: "12"
    }
    
    const context = {
        client: {
            clientName: "ANDROID",
            clientVersion: innertubeDetails.clientVersion,
            androidSdkVersion: 31,
            osName: "Android",
            osVersion: innertubeDetails.androidVersion,
            hl: "en",
            gl: "US"
        }
    }

    const url = `https://www.youtube.com/youtubei/v1/player?key=${innertubeDetails.apiKey}`;
    const data = {
        context: context,
        videoId: videoID,
        params: "8AEB",
        playbackContext: {
            contentPlaybackContext: {
                html5Preference: "HTML5_PREF_WANTS"
            }
        },
        contentCheckOk: true,
        racyCheckOk: true
    }

    try {
        const result = await fetch(url, {
            body: JSON.stringify(data),
            headers: {
                "X-Youtube-Client-Name": innertubeDetails.clientName,
                "X-Youtube-Client-Version": innertubeDetails.clientVersion,
                "User-Agent": `com.google.android.youtube/${innertubeDetails.clientVersion} (Linux; U; Android ${innertubeDetails.androidVersion}) gzip`,
                "Content-Type": "application/json",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-us,en;q=0.5",
                "Sec-Fetch-Mode": "navigate",
                "Connection": "close"
            },
            method: "POST"
        });

        if (result.ok) {
            const response = await result.json();
            const videoID = response?.videoDetails?.videoId ?? null;
            if (videoID !== videoID) {
                return {
                    formats: [],
                    duration: null,
                    channelID: null,
                    author: null
                };
            }
            
            const formats = response?.streamingData?.adaptiveFormats as InnerTubeFormat[];
            const duration = response?.videoDetails?.lengthSeconds ? parseInt(response.videoDetails.lengthSeconds) : null;
            const channelId = response?.videoDetails?.channelId ?? null;
            const author = response?.videoDetails?.author ?? null;
            if (formats) {
                return {
                    formats,
                    duration,
                    channelID: channelId,
                    author
                };
            }
        }

    } catch (e) { } //eslint-disable-line no-empty

    return {
        formats: [],
        duration: null,
        channelID: null,
        author: null
    };
}

export async function fetchVideoDataDesktopClient(videoID: VideoID): Promise<InnerTubeMetadata> {
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
        const result = await fetch(url, {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            method: "POST"
        });

        if (result.ok) {
            const response = await result.json();
            const videoID = response?.videoDetails?.videoId ?? null;
            if (videoID !== videoID) {
                return {
                    formats: [],
                    duration: null,
                    channelID: null,
                    author: null
                };
            }

            const formats = response?.streamingData?.adaptiveFormats as InnerTubeFormat[];
            const duration = response?.videoDetails?.lengthSeconds ? parseInt(response.videoDetails.lengthSeconds) : null;
            const channelId = response?.videoDetails?.channelId ?? null;
            const author = response?.videoDetails?.author ?? null;
            if (formats) {
                return {
                    formats,
                    duration,
                    channelID: channelId,
                    author
                };
            }
        }

    } catch (e) { } //eslint-disable-line no-empty

    return {
        formats: [],
        duration: null,
        channelID: null,
        author: null
    };
}

export async function getPlaybackFormats(videoID: VideoID,
    width?: number, height?: number, ignoreCache = false): Promise<Format | null> {
    const formats = await fetchVideoMetadata(videoID, ignoreCache);

    if (width && height) {
        const bestFormat = formats?.playbackUrls?.find?.(f => f?.width >= width && f?.height >= height);

        if (bestFormat) {
            cacheUsed(videoID);

            return bestFormat;
        }
    } else if (formats?.playbackUrls?.length > 0) {
        return formats[0];
    }

    return null;
}

export async function getChannelID(videoID: VideoID): Promise<ChannelInfo> {
    const metadata = await fetchVideoMetadata(videoID, false);

    if (metadata) {
        return {
            channelID: metadata.channelID,
            author: metadata.author
        };
    }

    return {
        channelID: null,
        author: null
    };
}

export function getChannelIDSync(videoID: VideoID): ChannelInfo | null {
    const cachedData = getFromCache(videoID);

    if (cachedData?.metadata) {
        return {
            channelID: cachedData.metadata.channelID,
            author: cachedData.metadata.author
        };
    }

    return null;
}
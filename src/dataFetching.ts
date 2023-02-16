import * as CompileConfig from "../config.json";

import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { ThumbnailResult, ThumbnailSubmission } from "./thumbnails/thumbnailData";
import { TitleResult, TitleSubmission } from "./titles/titleData";
import { FetchResponse, sendRequestToCustomServer } from "@ajayyy/maze-utils/lib/background-request-proxy";
import { BrandingResult } from "./videoBranding/videoBranding";
import { logError } from "./utils/logger";
import { getHash } from "@ajayyy/maze-utils/lib/hash";
import Config from "./config";

interface VideoBrandingCacheRecord {
    titles: TitleResult[];
    thumbnails: ThumbnailResult[];
    lastUsed: number;
}

const cache: Record<VideoID, VideoBrandingCacheRecord> = {};
const cacheLimit = 1000;

export async function getVideoBranding(videoID: VideoID, queryByHash: boolean): Promise<VideoBrandingCacheRecord | null> {
    const cachedValue = cache[videoID];

    const oneHour = 1000 * 60 * 60;
    if (cachedValue?.lastUsed > Date.now() - oneHour) {
        return cachedValue;
    }

    let result: BrandingResult | null = null;
    if (queryByHash) {
        const request = await sendRequestToServer("GET", `/api/branding/${(await getHash(videoID, 1)).slice(0, 4)}`);

        if (request.ok) {
            try {
                const json = JSON.parse(request.responseText);
                result = json?.[videoID];
            } catch (e) {
                logError(`Getting video branding for ${videoID} failed: ${e}`);
            }
        }
    } else {
        const request = await sendRequestToServer("GET", "/api/branding", {
            videoID
        });

        if (request.ok) {
            try {
                result = JSON.parse(request.responseText);
            } catch (e) {
                logError(`Getting video branding for ${videoID} failed: ${e}`);
            }
        }
    }
    
    if (result) {
        cache[videoID] = {
            titles: result.titles,
            thumbnails: result.thumbnails,
            lastUsed: Date.now()
        };

        if (Object.keys(cache).length > cacheLimit) {
            const oldestKey = Object.keys(cache).reduce((a, b) => cache[a].lastUsed < cache[b].lastUsed ? a : b);
            delete cache[oldestKey];
        }
    }

    return cache[videoID];
}

export function submitVideoBranding(videoID: VideoID, title: TitleSubmission, thumbnail: ThumbnailSubmission): Promise<FetchResponse> {
    return sendRequestToServer("POST", "/api/branding", {
        userID: Config.config!.userID,
        videoID,
        titles: title,
        thumbnails: thumbnail
    });
}

export function sendRequestToServer(type: string, url: string, data = {}): Promise<FetchResponse> {
    return sendRequestToCustomServer(type, CompileConfig.serverAddress + url, data);
}
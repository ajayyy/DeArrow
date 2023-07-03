import { VideoID } from "./maze-utils/video";
import { ThumbnailResult, ThumbnailSubmission, fetchVideoMetadata } from "./thumbnails/thumbnailData";
import { TitleResult, TitleSubmission } from "./titles/titleData";
import { FetchResponse, sendRealRequestToCustomServer, sendRequestToCustomServer } from "./maze-utils/background-request-proxy";
import { BrandingLocation, BrandingResult, updateBrandingForVideo } from "./videoBranding/videoBranding";
import { logError } from "./utils/logger";
import { getHash } from "./maze-utils/hash";
import Config, { ThumbnailCacheOption, ThumbnailFallbackOption } from "./config/config";
import { generateUserID } from "./maze-utils/setup";
import { BrandingUUID } from "./videoBranding/videoBranding";
import { timeoutPomise } from "./maze-utils";
import { isCachedThumbnailLoaded, setupPreRenderedThumbnail, thumbnailCacheDownloaded } from "./thumbnails/thumbnailRenderer";
import { setupCache } from "./thumbnails/thumbnailDataCache";
import * as CompileConfig from "../config.json";
import { alea } from "seedrandom";
import { getThumbnailFallbackOption, getThumbnailFallbackOptionFastCheck, shouldReplaceThumbnails, shouldReplaceThumbnailsFastCheck } from "./config/channelOverrides";

interface VideoBrandingCacheRecord extends BrandingResult {
    lastUsed: number;
}

interface ActiveThumbnailCacheRequestInfo {
    shouldRerequest: boolean;
    currentRequest: Promise<Record<VideoID, BrandingResult> | null>;
    time?: number;
    officialImage?: boolean;
    generateNow?: boolean;
}

const cache: Record<VideoID, VideoBrandingCacheRecord> = {};
const cacheLimit = 10000;

const activeRequests: Record<VideoID, Promise<Record<VideoID, BrandingResult> | null>> = {};
const activeThumbnailCacheRequests: Record<VideoID, ActiveThumbnailCacheRequestInfo> = {};

export async function getVideoThumbnailIncludingUnsubmitted(videoID: VideoID, brandingLocation?: BrandingLocation,
        returnRandomTime = true): Promise<ThumbnailResult | null> {
    const unsubmitted = Config.local!.unsubmitted[videoID]?.thumbnails?.find(t => t.selected);
    if (unsubmitted) {
        return {
            ...unsubmitted,
            votes: 0,
            locked: false,
            UUID: generateUserID() as BrandingUUID
        };
    }

    const brandingData = await getVideoBranding(videoID, brandingLocation === BrandingLocation.Watch, brandingLocation);
    const result = brandingData?.thumbnails[0];
    if (!result || (!result.locked && result.votes < 0)) {
        if (returnRandomTime && brandingData) {
            const timestamp = await getTimestampFromRandomTime(videoID, brandingData, brandingLocation);

            if (timestamp !== null) {
                return {
                    UUID: generateUserID() as BrandingUUID,
                    votes: 0,
                    locked: false,
                    timestamp: timestamp,
                    original: false
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else {
        return result;
    }
}

async function getTimestampFromRandomTime(videoID: VideoID, brandingData: BrandingResult,
        brandingLocation?: BrandingLocation): Promise<number | null> {
    const fastThumbnailOptionCheck = getThumbnailFallbackOptionFastCheck(videoID);
    if (fastThumbnailOptionCheck === null || fastThumbnailOptionCheck === ThumbnailFallbackOption.RandomTime) {
        let videoDuration = brandingData.videoDuration;
        if (!videoDuration) {
            const metadata = await fetchVideoMetadata(videoID, false);
            if (metadata) videoDuration = metadata.duration;
        }

        if (videoDuration) {
            // Occurs when fetching by hash and no record exists in the db (SponsorBlock or otherwise)
            if (brandingData.randomTime == null) {
                brandingData.randomTime = alea(videoID)() * videoDuration;
            }

            const timestamp = brandingData.randomTime * videoDuration;
            if (!isCachedThumbnailLoaded(videoID, timestamp)) {
                // Only an official time for default server address
                queueThumbnailCacheRequest(videoID, timestamp, undefined, isOfficialTime(),
                    checkShouldGenerateNow(brandingLocation));
            }

            // Wait here for actual thumbnail cache fallback option
            if (await getThumbnailFallbackOption(videoID) !== ThumbnailFallbackOption.RandomTime) {
                return null;
            }

            return timestamp;
        } else {
            return null;
        }
    } else {
        return null;
    }
}

export async function getVideoTitleIncludingUnsubmitted(videoID: VideoID, brandingLocation?: BrandingLocation): Promise<TitleResult | null> {
    const unsubmitted = Config.local?.unsubmitted?.[videoID]?.titles?.find(t => t.selected);
    if (unsubmitted) {
        return {
            ...unsubmitted,
            votes: 0,
            locked: false,
            UUID: generateUserID() as BrandingUUID,
            original: false
        };
    }

    const result = (await getVideoBranding(videoID, brandingLocation === BrandingLocation.Watch, brandingLocation))?.titles[0];
    if (!result || (!result.locked && result.votes < 0)) {
        return null;
    } else {
        return result;
    }
}

export async function getVideoBranding(videoID: VideoID, queryByHash: boolean, brandingLocation?: BrandingLocation): Promise<VideoBrandingCacheRecord | null> {
    const cachedValue = cache[videoID];

    if (cachedValue) {
        return cachedValue;
    }

    if (Config.config!.thumbnailCacheUse === ThumbnailCacheOption.Disable) {
        // Always query by hash when not using thumbnail cache
        queryByHash = true;
    }

    activeRequests[videoID] ??= (async () => {
        const shouldGenerateBranding = Config.config!.thumbnailCacheUse === ThumbnailCacheOption.OnAllPages 
            || (brandingLocation !== BrandingLocation.Watch && Config.config!.thumbnailCacheUse !== ThumbnailCacheOption.Disable);
        const shouldGenerateNow = checkShouldGenerateNow(brandingLocation);

        const results = fetchBranding(queryByHash, videoID);
        const thumbnailCacheResults = shouldGenerateBranding ? 
            fetchBrandingFromThumbnailCache(videoID, undefined, undefined, undefined, shouldGenerateNow) 
            : Promise.resolve(null);

        const handleResults = (results: Record<VideoID, BrandingResult>) => {
            for (const [key, result] of Object.entries(results)) {
                cache[key] = {
                    titles: result.titles,
                    thumbnails: result.thumbnails,
                    randomTime: result.randomTime,
                    videoDuration: result.videoDuration,
                    lastUsed: key === videoID ? Date.now() : cache[key]?.lastUsed ?? 0
                };
            }
    
            const keys = Object.keys(cache);
            if (keys.length > cacheLimit) {
                const numberToDelete = keys.length - cacheLimit + 20;
    
                for (let i = 0; i < numberToDelete; i++) {
                    const oldestKey = Object.keys(cache).reduce((a, b) => cache[a]?.lastUsed < cache[b]?.lastUsed ? a : b);
                    delete cache[oldestKey];
                }
            }
        };

        let mainFetchDone = false;
        let thumbnailCacheFetchDone = false;
        results.then(async (results) => {
            mainFetchDone = true;

            if (results) {
                const oldResults = cache[videoID];
                handleResults(results);

                if (results[videoID]) {
                    const thumbnail = results[videoID].thumbnails[0];
                    const title = results[videoID].titles[0];

                    const timestamp = thumbnail && !thumbnail.original ? thumbnail.timestamp 
                        : await getTimestampFromRandomTime(videoID, results[videoID]);

                    // Fetch for a cached thumbnail if it is either not loaded yet, or has an out of date title
                    if (timestamp !== null
                            && (!isCachedThumbnailLoaded(videoID, timestamp) || (title?.title && oldResults?.titles?.length <= 0))) {
                        queueThumbnailCacheRequest(videoID, timestamp, title?.title, isOfficialTime(),
                            shouldGenerateNow);
                    }
                }

                if (thumbnailCacheFetchDone) {
                    updateBrandingForVideo(videoID).catch(logError);
                }
            }
        }).catch(logError);

        thumbnailCacheResults.then(async (results) => {
            if (results) {
                if (await getThumbnailFallbackOption(videoID) === ThumbnailFallbackOption.RandomTime && !mainFetchDone) {
                    thumbnailCacheFetchDone = true;

                    handleResults(results);
                }
            }
        }).catch(logError);

        const fastest = await Promise.race([results, thumbnailCacheResults]);
        if (fastest) {
            return fastest;
        } else {
            // Always take results of thumbnail cache results is null
            return results;
        }
    })();
    activeRequests[videoID].catch(() => delete activeRequests[videoID]);

    try {
        await Promise.race([timeoutPomise(Config.config?.fetchTimeout).catch(() => ({})), activeRequests[videoID]]);
        delete activeRequests[videoID];
    
        return cache[videoID];
    } catch (e) {
        logError(e);
        return null;
    }
}

function checkShouldGenerateNow(brandingLocation: BrandingLocation | undefined): boolean {
    return brandingLocation === BrandingLocation.Watch;
}

function isOfficialTime(): boolean {
    return Config.config?.serverAddress === Config.syncDefaults.serverAddress && !CompileConfig.debug;
}

async function fetchBranding(queryByHash: boolean, videoID: VideoID): Promise<Record<VideoID, BrandingResult> | null> {
    let results: Record<VideoID, BrandingResult> | null = null;

    if (queryByHash) {
        const request = await sendRequestToServer("GET", `/api/branding/${(await getHash(videoID, 1)).slice(0, 4)}`);

        if (request.ok || request.status === 404) {
            try {
                const json = JSON.parse(request.responseText);
                if (!json[videoID]) {
                    // Add empty object
                    json[videoID] = {
                        thumbnails: [],
                        titles: [],
                        randomTime: null,
                        videoDuration: null
                    };
                }

                results = json;
            } catch (e) {
                logError(`Getting video branding for ${videoID} failed: ${e}`);
            }
        }
    } else {
        const request = await sendRequestToServer("GET", "/api/branding", {
            videoID
        });

        if (request.ok || request.status === 404) {
            try {
                results = {
                    [videoID]: JSON.parse(request.responseText)
                };
            } catch (e) {
                logError(`Getting video branding for ${videoID} failed: ${e}`);
            }
        }
    }
    return results;
}

async function fetchBrandingFromThumbnailCache(videoID: VideoID, time?: number, title?: string, officialImage?: boolean, generateNow?: boolean, tries = 0): Promise<Record<VideoID, BrandingResult> | null> {
    if (Config.config!.thumbnailCacheUse === ThumbnailCacheOption.Disable
        || shouldReplaceThumbnailsFastCheck(videoID) === false) return null;

    const result = (async () => {
        try {
            const request = await sendRequestToThumbnailCache(videoID, time, title, officialImage, generateNow);
    
            if (request.status === 200) {
                try {
                    const timestamp = parseFloat(request.headers.get("x-timestamp") as string);
                    const title = request.headers.get("x-title");
                    
                    if (activeThumbnailCacheRequests[videoID].shouldRerequest 
                        && activeThumbnailCacheRequests[videoID].time !== timestamp
                        && tries < 2) {
                        // Stop and refetch with the proper timestamp
                        return handleThumbnailCacheRefetch(videoID, time, generateNow, tries + 1);
                    }
                        
                    if (isNaN(timestamp)) {
                        logError(`Getting video branding from cache server for ${videoID} failed: Timestamp is NaN`);
                        return null;
                    }

                    if (!await shouldReplaceThumbnails(videoID)) {
                        // This check is done so late to make sure it doesn't slow down the original fetch
                        return null;
                    }
    
                    await setupPreRenderedThumbnail(videoID, timestamp, await request.blob());
                    delete activeThumbnailCacheRequests[videoID];
    
                    return {
                        [videoID]: {
                            titles: title ? [{
                                votes: 0,
                                locked: false,
                                UUID: generateUserID() as BrandingUUID,
                                original: false,
                                title: title
                            }] : [],
                            thumbnails: [{
                                votes: 0,
                                locked: false,
                                UUID: generateUserID() as BrandingUUID,
                                original: false,
                                timestamp
                            }],
                            randomTime: null,
                            videoDuration: null
                        }
                    };
                } catch (e) {
                    logError(`Getting video branding for ${videoID} failed: ${e}`);
                }
            } else if (activeThumbnailCacheRequests[videoID].shouldRerequest && tries < 2) {
                const nextTry = await handleThumbnailCacheRefetch(videoID, time, generateNow, tries + 1);
                if (nextTry) {
                    return nextTry;
                }
            }
        } catch (e) {
            logError(`Error getting thumbnail cache data for ${e}`);
        }
    
        if (time !== undefined && generateNow === true) {
            const videoCache = setupCache(videoID);
            videoCache.thumbnailCachesFailed.add(time);
    
            // If the thumbs already failured rendering, send nulls
            // Would be blank otherwise
            for (const failure of videoCache.failures) {
                if (failure.timestamp === time) {
                    for (const callback of failure.onReady) {
                        callback(null);
                    }
                }
            }
    
            videoCache.failures = videoCache.failures.filter((failure) => failure.timestamp !== time);
        }
        
        delete activeThumbnailCacheRequests[videoID];
        return null;
    })();
    
    activeThumbnailCacheRequests[videoID] = {
        shouldRerequest: false,
        currentRequest: result,
        time
    };

    void result.then(() => thumbnailCacheDownloaded(videoID));

    return await result;
}

function handleThumbnailCacheRefetch(videoID: VideoID, time: number | undefined,
        generateNow: boolean | undefined, tries: number): Promise<Record<VideoID, BrandingResult> | null> {
    const data = activeThumbnailCacheRequests[videoID];
    delete activeThumbnailCacheRequests[videoID];

    if (data.time !== time || (data.generateNow && !generateNow)) {
        return fetchBrandingFromThumbnailCache(videoID, data.time, cache[videoID]?.titles?.[0]?.title, data.officialImage, data.generateNow, tries);
    }

    return Promise.resolve(null);
}

export function isFetchingFromThumbnailCache(videoID: VideoID, time?: number): boolean {
    const activeRequest = activeThumbnailCacheRequests[videoID];
    return activeRequest && (time === undefined || activeRequest.time === time);
}

export async function waitForThumbnailCache(videoID: VideoID): Promise<void> {
    const activeRequest = activeThumbnailCacheRequests[videoID];
    if (!activeRequest) return;

    await activeRequest.currentRequest;
}

export function getNumberOfThumbnailCacheRequests(): number {
    return Object.keys(activeThumbnailCacheRequests).length;
}

export function queueThumbnailCacheRequest(videoID: VideoID, time?: number, title?: string,
        officialTime?: boolean, generateNow?: boolean): void {
    if (activeThumbnailCacheRequests[videoID]) {
        if (activeThumbnailCacheRequests[videoID].time !== time 
            || activeThumbnailCacheRequests[videoID].generateNow !== generateNow) {
                activeThumbnailCacheRequests[videoID].shouldRerequest = true;
        }
        if (activeThumbnailCacheRequests[videoID].time === time) {
            // If official time, and time is the same, still keep that it is the official time
            officialTime ||= activeThumbnailCacheRequests[videoID].officialImage
        }

        activeThumbnailCacheRequests[videoID].time = time;
        activeThumbnailCacheRequests[videoID].generateNow ||= generateNow ?? false;
        activeThumbnailCacheRequests[videoID].officialImage = officialTime ?? false;
        return;
    }

    fetchBrandingFromThumbnailCache(videoID, time, title, officialTime, generateNow).catch(logError);
}

export function clearCache(videoID: VideoID) {
    delete cache[videoID];
}

export async function submitVideoBranding(videoID: VideoID, title: TitleSubmission | null, thumbnail: ThumbnailSubmission | null): Promise<FetchResponse> {
    const result = await sendRequestToServer("POST", "/api/branding", {
        userID: Config.config!.userID,
        videoID,
        title,
        thumbnail
    });

    clearCache(videoID);
    return result;
}

export function sendRequestToServer(type: string, url: string, data = {}): Promise<FetchResponse> {
    return sendRequestToCustomServer(type, Config.config!.serverAddress + url, data);
}

export function sendRequestToThumbnailCache(videoID: string, time?: number, title?: string,
        officialTime = false, generateNow = false): Promise<Response> {
    const data = {
        videoID,
        officialTime,
        generateNow
    };

    if (time != null) {
        data["time"] = time;
    }

    if (title) {
        data["title"] = title;
    }
    
    return sendRealRequestToCustomServer("GET", `${Config.config?.thumbnailServerAddress}/api/v1/getThumbnail`, data);
}
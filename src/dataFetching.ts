import { VideoID, getVideo, getVideoID, getYouTubeVideoID } from "../maze-utils/src/video";
import { ThumbnailSubmission, ThumbnailWithRandomTimeResult } from "./thumbnails/thumbnailData";
import { TitleResult, TitleSubmission } from "./titles/titleData";
import { FetchResponse, FetchResponseBinary, logRequest, sendBinaryRequestToCustomServer } from "../maze-utils/src/background-request-proxy";
import { BrandingLocation, BrandingResult, CasualVoteInfo, replaceCurrentVideoBranding, updateBrandingForVideo } from "./videoBranding/videoBranding";
import { logError } from "./utils/logger";
import { getHash } from "../maze-utils/src/hash";
import Config, { ThumbnailCacheOption, ThumbnailFallbackOption } from "./config/config";
import { generateUserID } from "../maze-utils/src/setup";
import { BrandingUUID } from "./videoBranding/videoBranding";
import { extensionUserAgent, objectToURI, timeoutPomise } from "../maze-utils/src";
import { isCachedThumbnailLoaded, setupPreRenderedThumbnail, thumbnailCacheDownloaded } from "./thumbnails/thumbnailRenderer";
import * as CompileConfig from "../config.json";
import { alea } from "seedrandom";
import { getThumbnailFallbackOption, getThumbnailFallbackOptionFastCheck, shouldReplaceThumbnails, shouldReplaceThumbnailsFastCheck } from "./config/channelOverrides";
import { updateSubmitButton } from "./video";
import { sendRequestToServer } from "./utils/requests";
import { thumbnailDataCache } from "./thumbnails/thumbnailDataCache";
import { getAutoWarning } from "./submission/autoWarning";
import { fetchVideoMetadata, isLiveSync } from "../maze-utils/src/metadataFetcher";
import { getCurrentPageTitle } from "../maze-utils/src/elements";
import { formatJSErrorMessage, getLongErrorMessage } from "../maze-utils/src/formating";

interface VideoBrandingCacheRecord extends BrandingResult {
    lastUsed: number;
    fullReply: boolean; // If false, it is just a reply from the thumbnail cache server
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

const activeRequests: Record<VideoID, [Promise<Record<VideoID, BrandingResult> | null>, Promise<Record<VideoID, BrandingResult> | null>]> = {};
const activeThumbnailCacheRequests: Record<VideoID, ActiveThumbnailCacheRequestInfo> = {};

export async function getVideoThumbnailIncludingUnsubmitted(videoID: VideoID, brandingLocation?: BrandingLocation,
        returnRandomTime = true): Promise<ThumbnailWithRandomTimeResult | null> {
    const unsubmitted = Config.local!.unsubmitted[videoID]?.thumbnails?.find(t => t.selected);
    if (unsubmitted) {
        return {
            ...unsubmitted,
            votes: 0,
            locked: false,
            UUID: generateUserID() as BrandingUUID,
            isRandomTime: false
        };
    }

    const brandingData = await getVideoBranding(videoID, brandingLocation === BrandingLocation.Watch, false, brandingLocation);
    const result = brandingData?.thumbnails[0];
    if (!result || (!result.locked && result.votes < 0)) {
        if (returnRandomTime) {
            const timestamp = await getTimestampFromRandomTime(videoID, brandingData, brandingLocation);

            if (timestamp !== null) {
                return {
                    UUID: generateUserID() as BrandingUUID,
                    votes: 0,
                    locked: false,
                    timestamp: timestamp,
                    original: false,
                    isRandomTime: true
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else {
        return {
            ...result,
            isRandomTime: false
        };
    }
}

async function getTimestampFromRandomTime(videoID: VideoID, brandingData: BrandingResult | null,
        brandingLocation?: BrandingLocation): Promise<number | null> {
    const fastThumbnailOptionCheck = getThumbnailFallbackOptionFastCheck(videoID);
    if (fastThumbnailOptionCheck === null || fastThumbnailOptionCheck === ThumbnailFallbackOption.RandomTime) {
        let timestamp: number | null = null;
        let videoDuration = brandingData?.videoDuration;
        if (!videoDuration) {
            const metadata = await fetchVideoMetadata(videoID, false);
            if (metadata) {
                videoDuration = metadata.duration;

                if (metadata.isLive && !metadata.isUpcoming) {
                    timestamp = 0;
                }
            }
        }

        if (videoDuration) {
            // Occurs when fetching by hash and no record exists in the db (SponsorBlock or otherwise)
            if (!brandingData || brandingData.randomTime == null) {
                if (!brandingData) {
                    brandingData = {
                        thumbnails: [],
                        titles: [],
                        randomTime: 0,
                        videoDuration: videoDuration,
                        casualVotes: []
                    };
                }

                brandingData.randomTime = alea(videoID)();
                // Don't allow random times past 90% of the video, only gets here if there were no segments
                if (brandingData.randomTime > 0.9) {
                    brandingData.randomTime -= 0.9;
                }
            }

            timestamp = brandingData.randomTime * videoDuration;
        }

        if (timestamp !== null) {
            if (!isCachedThumbnailLoaded(videoID, timestamp)) {
                // Only an official time for default server address
                queueThumbnailCacheRequest(videoID, timestamp, undefined, isOfficialTime(),
                    checkShouldGenerateNow(brandingLocation));
            }

            // Wait here for actual thumbnail cache fallback option
            if (await getThumbnailFallbackOption(videoID) !== ThumbnailFallbackOption.RandomTime) {
                return null;
            }
        }

        return timestamp;
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

    const result = (await getVideoBranding(videoID, brandingLocation === BrandingLocation.Watch, false, brandingLocation))?.titles[0];
    if (!result || (!result.locked && result.votes < 0)) {
        return null;
    } else {
        return result;
    }
}

export async function getVideoCasualInfo(videoID: VideoID, brandingLocation?: BrandingLocation): Promise<CasualVoteInfo[]> {
    const result = (await getVideoBranding(videoID, brandingLocation === BrandingLocation.Watch, true, brandingLocation))?.casualVotes;
    return result ?? [];
}

export async function getVideoBranding(videoID: VideoID, queryByHash: boolean, waitForFullReply: boolean, brandingLocation?: BrandingLocation): Promise<VideoBrandingCacheRecord | null> {
    const cachedValue = cache[videoID];

    if (cachedValue && (!waitForFullReply || cachedValue.fullReply)) {
        return cachedValue;
    }

    if (Config.config!.thumbnailCacheUse === ThumbnailCacheOption.Disable) {
        // Always query by hash when not using thumbnail cache
        queryByHash = true;
    }

    activeRequests[videoID] ??= (() => {
        const shouldGenerateBranding = Config.config!.thumbnailCacheUse === ThumbnailCacheOption.OnAllPages 
            || (brandingLocation !== BrandingLocation.Watch && Config.config!.thumbnailCacheUse !== ThumbnailCacheOption.Disable);
        const shouldGenerateNow = checkShouldGenerateNow(brandingLocation);

        const results = fetchBranding(queryByHash, videoID);
        const thumbnailCacheResults = shouldGenerateBranding ? 
            fetchBrandingFromThumbnailCache(videoID, undefined, undefined, undefined, shouldGenerateNow) //todo: this?
            : Promise.resolve(null);

        const handleResults = (results: Record<VideoID, BrandingResult>, fullReply: boolean) => {
            for (const [key, result] of Object.entries(results)) {
                if (result.titles.length > 0) {
                    result.titles.forEach((title) => title.title = title.title.replace(/‹/ug, "<"));
                }

                cache[key] = {
                    titles: result.titles,
                    thumbnails: result.thumbnails,
                    randomTime: result.randomTime,
                    videoDuration: result.videoDuration,
                    casualVotes: result.casualVotes,
                    lastUsed: key === videoID ? Date.now() : cache[key]?.lastUsed ?? 0,
                    fullReply
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
                handleResults(results, true);

                const currentResult = results[videoID];
                if (currentResult) {
                    if (currentResult.titles.length > 0) {
                        currentResult.titles.forEach((title) => title.title = title.title.replace(/‹/ug, "<"));
                    }

                    const thumbnail = currentResult.thumbnails[0];
                    const title = currentResult.titles[0];

                    const timestamp = thumbnail && !thumbnail.original ? thumbnail.timestamp 
                        : await getTimestampFromRandomTime(videoID, currentResult);

                    // Fetch for a cached thumbnail if it is either not loaded yet, or has an out of date title
                    if (timestamp !== null
                            && (!isCachedThumbnailLoaded(videoID, timestamp) 
                                || (title?.title && oldResults?.titles?.length <= 0)
                                || (title?.title !== oldResults?.titles?.[0]?.title))) {
                        queueThumbnailCacheRequest(videoID, timestamp, title?.title, isOfficialTime(),
                            shouldGenerateNow);
                    }
                } else if (thumbnailCacheFetchDone) {
                    // The results from that thumbnail cache fetch are wrong still
                    cache[videoID] = {
                        titles: [],
                        thumbnails: [],
                        randomTime: null,
                        videoDuration: null,
                        casualVotes: [],
                        lastUsed: Date.now(),
                        fullReply: true
                    };
                }

                if (thumbnailCacheFetchDone) {
                    if (videoID === getVideoID()) {
                        updateSubmitButton(results[videoID]);
                    }

                    updateBrandingForVideo(videoID).catch(logError);
                }
            }
        }).catch(logError);

        thumbnailCacheResults.then(async (results) => {
            if (results) {
                if (await getThumbnailFallbackOption(videoID) === ThumbnailFallbackOption.RandomTime && !mainFetchDone) {
                    thumbnailCacheFetchDone = true;

                    handleResults(results, true);
                }
            }
        }).catch(logError);

        return [(async () => {
            const fastest = await Promise.race([results, thumbnailCacheResults]);

            if (fastest) {
                return fastest;
            } else {
                // Always take results of thumbnail cache results is null
                return results;
            }
        })(), results];
    })();
    activeRequests[videoID][0].catch(() => delete activeRequests[videoID]);

    try {
        const timeout = timeoutPomise(Config.config?.fetchTimeout).catch(() => ({}));
        if (waitForFullReply) {
            await Promise.race([timeout, activeRequests[videoID][1]]);
        } else {
            await Promise.race([timeout, activeRequests[videoID][0]]);
        }
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

    // i usually hate try/catches that catch the nearly the whole function...
    // ... but this one just seems to.. make sense?   - mini_bomba
    try {
        if (queryByHash) {
            const request = await sendRequestToServer("GET", `/api/branding/${(await getHash(videoID, 1)).slice(0, 4)}`, {
                fetchAll: true
            });

            if (request.ok || request.status === 404) {
                const json = JSON.parse(request.responseText);
                if (!json[videoID]) {
                    // Add empty object
                    json[videoID] = {
                        thumbnails: [],
                        titles: [],
                        randomTime: null,
                        videoDuration: null,
                        casualVotes: []
                    } as BrandingResult;
                }

                results = json;
            } else {
                logRequest(request, "CB", `video branding for ${videoID}`);
            }
        } else {
            const request = await sendRequestToServer("GET", "/api/branding", {
                videoID,
                fetchAll: true
            });

            if (request.ok || request.status === 404) {
                results = {
                    [videoID]: JSON.parse(request.responseText)
                };
            } else {
                logRequest(request, "CB", `video branding for ${videoID}`);
            }
        }
    } catch (e) {
        logError(`Getting video branding for ${videoID} failed:`, e);
    }
    return results;
}

async function fetchBrandingFromThumbnailCache(videoID: VideoID, time?: number, title?: string, officialImage?: boolean, generateNow?: boolean, tries = 0): Promise<Record<VideoID, BrandingResult> | null> {
    if (Config.config!.thumbnailCacheUse === ThumbnailCacheOption.Disable
        || shouldReplaceThumbnailsFastCheck(videoID) === false) return null;

    const result = (async () => {
        try {
            // Live videos have no backup, so try to generate it now
            const isLive = !!isLiveSync(videoID);
            const request = await sendRequestToThumbnailCache(videoID, time, title, officialImage, isLive, generateNow || isLive);

            if (request.status === 200 && request.headers) {
                try {
                    const timestamp = parseFloat(request.headers["x-timestamp"]);
                    const title = request.headers["x-title"];

                    if (activeThumbnailCacheRequests[videoID]
                        && activeThumbnailCacheRequests[videoID].shouldRerequest 
                        && activeThumbnailCacheRequests[videoID].time !== timestamp
                        && activeThumbnailCacheRequests[videoID].time?.toFixed(3) !== timestamp.toFixed(3)
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

                    setupPreRenderedThumbnail(videoID, timestamp, 
                        (request.responseBinary instanceof Blob) ? 
                            request.responseBinary : new Blob([new Uint8Array(request.responseBinary).buffer]));
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
                            videoDuration: null,
                            casualVotes: []
                        }
                    };
                } catch (e) {
                    logError(`Getting video branding for ${videoID} failed:`, e);
                }
            } else if (activeThumbnailCacheRequests[videoID].shouldRerequest && tries < 2) {
                const nextTry = await handleThumbnailCacheRefetch(videoID, time, generateNow, tries + 1);
                if (nextTry) {
                    return nextTry;
                }
            }
        } catch (e) {
            logError(`Error getting thumbnail cache data for ${videoID}:`, e);
        }

        if (time !== undefined && generateNow === true) {
            const videoCache = thumbnailDataCache.setupCache(videoID);
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

export function isActiveThumbnailCacheRequest(videoID: VideoID): boolean {
    return !!activeThumbnailCacheRequests[videoID];
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

export async function submitVideoBranding(videoID: VideoID, title: TitleSubmission | null,
        thumbnail: ThumbnailSubmission | null, downvote = false, actAsVip = false): Promise<FetchResponse> {

    if (thumbnail && !downvote && !Config.config!.firstThumbnailSubmitted) {
        Config.config!.firstThumbnailSubmitted = true;
    }

    const wasWarned = !!title && !!getAutoWarning(title.title, getCurrentPageTitle() || "");

    const result = await sendRequestToServer("POST", "/api/branding", {
        userID: Config.config!.userID,
        videoID,
        title,
        thumbnail,
        downvote,
        autoLock: actAsVip,
        videoDuration: getVideo()?.duration,
        wasWarned,
        casualMode: Config.config!.casualMode,
        userAgent: extensionUserAgent(),
    });

    clearCache(videoID);
    return result;
}

export async function submitVideoCasualVote(videoID: VideoID, categories: string[], downvote: boolean): Promise<FetchResponse> {
    const result = await sendRequestToServer("POST", "/api/casual", {
        userID: Config.config!.userID,
        videoID,
        categories,
        downvote,
        title: getCurrentPageTitle(),
        userAgent: extensionUserAgent(),
    });

    clearCache(videoID);
    return result;
}

/**
 * Also does alerts
 */
export async function submitVideoBrandingAndHandleErrors(title: TitleSubmission | null,
        thumbnail: ThumbnailSubmission | null, downvote: boolean, actAsVip: boolean): Promise<boolean> {
    if (getVideoID() !== getYouTubeVideoID()) {
        alert(chrome.i18n.getMessage("videoIDWrongWhenSubmittingError"));
        return false;
    }

    let result: FetchResponse;
    try {
        result = await submitVideoBranding(getVideoID()!, title, thumbnail, downvote, actAsVip);
    } catch (e) {
        logError("Caught error while submitting video branding", e);
        alert(formatJSErrorMessage(e));
        return false;
    }

    if (result && result.ok) {
        replaceCurrentVideoBranding().catch(logError);

        return true;
    } else {
        logRequest(result, "CB", "video branding submission");
        alert(getLongErrorMessage(result.status, result.responseText));
        return false;
    }
}

export function sendRequestToThumbnailCache(videoID: string, time?: number, title?: string,
        officialTime = false, isLivestream = false, generateNow = false): Promise<FetchResponseBinary> {
    const data = {
        videoID,
        officialTime,
        generateNow,
        isLivestream
    };

    if (time != null) {
        data["time"] = time;
    }

    if (title) {
        data["title"] = title;
    }
    
    return sendBinaryRequestToCustomServer("GET", `${Config.config?.thumbnailServerAddress}/api/v1/getThumbnail`, data);
}

export function getThumbnailUrl(videoID: string, time: number): string {
    return objectToURI(`${Config.config?.thumbnailServerAddress}/api/v1/getThumbnail`, {
        videoID,
        time
    }, true);
}

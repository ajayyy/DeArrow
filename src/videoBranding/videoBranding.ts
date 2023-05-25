import { getYouTubeTitleNodeSelector } from "@ajayyy/maze-utils/lib/elements";
import { getVideoID, VideoID } from "@ajayyy/maze-utils/lib/video";
import { isVisible, waitForElement } from "@ajayyy/maze-utils/lib/dom";
import { ThumbnailResult } from "../thumbnails/thumbnailData";
import { replaceThumbnail } from "../thumbnails/thumbnailRenderer";
import { TitleResult } from "../titles/titleData";
import { findOrCreateShowOriginalButton, getOrCreateTitleElement, hideAndUpdateShowOriginalButton as hideAndUpdateShowOriginalButton, replaceTitle } from "../titles/titleRenderer";
import { setThumbnailListener } from "@ajayyy/maze-utils/lib/thumbnailManagement";
import Config from "../config";
import { logError } from "../utils/logger";

export type BrandingUUID = string & { readonly __brandingUUID: unique symbol };

export interface BrandingResult {
    titles: TitleResult[];
    thumbnails: ThumbnailResult[];
}

export enum BrandingLocation {
    Related,
    Watch,
    Endcards,
    Autoplay,
    EndRecommendations
}

export interface VideoBrandingInstance {
    showCustomBranding: boolean;
    updateBrandingCallbacks: Array<() => Promise<void>>;
}

export const brandingBoxSelector = "ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer, ytd-compact-radio-renderer, ytd-compact-movie-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer, ytd-grid-video-renderer, ytd-grid-movie-renderer, ytd-rich-grid-slim-media, ytd-radio-renderer, ytd-reel-item-renderer, ytd-compact-playlist-renderer";

const videoBrandingInstances: Record<VideoID, VideoBrandingInstance> = {}

export async function replaceCurrentVideoBranding(): Promise<[boolean, boolean]> {
    const title = await waitForElement(getYouTubeTitleNodeSelector(), true) as HTMLElement;
    const promises: [Promise<boolean>, Promise<boolean>] = [Promise.resolve(false), Promise.resolve(false)]
    const videoID = getVideoID();

    if (videoID !== null && isVisible(title)) {
        if (title) {
            const videoBrandingInstance = getAndUpdateVideoBrandingInstances(videoID,
                async () => void await replaceCurrentVideoBranding());
            const brandingLocation = BrandingLocation.Watch;
            const showCustomBranding = videoBrandingInstance.showCustomBranding;
    
            promises[0] = replaceTitle(title, videoID, showCustomBranding, brandingLocation, true);

            void handleShowOriginalButton(title, videoID, brandingLocation, showCustomBranding, promises);
        }

        //todo: replace thumbnail in background of .ytp-cued-thumbnail-overlay-image
    }

    return Promise.all(promises);
}

export async function replaceVideoCardsBranding(elements: HTMLElement[]): Promise<[boolean, boolean][]> {
    return await Promise.all(elements.map((e) => replaceVideoCardBranding(e, BrandingLocation.Related)));
}

export async function replaceVideoCardBranding(element: HTMLElement, brandingLocation: BrandingLocation,
        verifyVideoID?: VideoID, tries = 0): Promise<[boolean, boolean]> {
    const link = getLinkElement(element, brandingLocation);

    if (link) {
        const videoID = extractVideoID(link);
        const isPlaylistVideo = isPlaylist(link);

        if (verifyVideoID && videoID !== verifyVideoID) {
            // Don't need this branding update anymore, it was trying to update for a different video
            return [false, false];
        }

        const videoBrandingInstance = getAndUpdateVideoBrandingInstances(videoID,
            async () => void await replaceVideoCardBranding(element, brandingLocation, videoID));
        const showCustomBranding = videoBrandingInstance.showCustomBranding;

        const videoPromise = replaceThumbnail(element, videoID, brandingLocation, showCustomBranding);
        const titlePromise = !isPlaylistVideo 
            ? replaceTitle(element, videoID, showCustomBranding, brandingLocation, false) 
            : Promise.resolve(false);

        if (isPlaylistVideo) {
            // Still create title element to make sure show original button will be in the right place
            getOrCreateTitleElement(element, brandingLocation);
        }

        const promises = [videoPromise, titlePromise] as [Promise<boolean>, Promise<boolean>];

        void handleShowOriginalButton(element, videoID, brandingLocation, showCustomBranding, promises);

        const result = await Promise.all(promises);

        if (videoID !== extractVideoID(link) && extractVideoID(link) && tries < 2) {
            // Video ID changed, so try again
            return replaceVideoCardBranding(element, brandingLocation, verifyVideoID, tries++);
        }

        return result;
    }

    return [false, false];
}

export function getLinkElement(element: HTMLElement, brandingLocation: BrandingLocation): HTMLAnchorElement {
    switch (brandingLocation) {
        case BrandingLocation.Related:
            return element.querySelector("a#thumbnail") as HTMLAnchorElement;
        case BrandingLocation.Endcards:
            return element.querySelector("a.ytp-ce-covering-overlay") as HTMLAnchorElement;
        case BrandingLocation.Autoplay:
            return element.querySelector("a.ytp-autonav-endscreen-link-container") as HTMLAnchorElement;
        case BrandingLocation.EndRecommendations:
            return element as HTMLAnchorElement;
        default:
            throw new Error("Invalid branding location");
    }
}

function extractVideoID(link: HTMLAnchorElement) {
    return link.href?.match(/(?<=(?:\?|&)v=).{11}|(?<=\/shorts\/).{11}/)?.[0] as VideoID;
}

function isPlaylist(link: HTMLAnchorElement) {
    return link.href?.match(/list=/)?.[0] !== undefined;
}

export async function handleShowOriginalButton(element: HTMLElement, videoID: VideoID,
        brandingLocation: BrandingLocation, showCustomBranding: boolean,
        promises: [Promise<boolean>, Promise<boolean>]): Promise<HTMLElement | null> {
    await hideAndUpdateShowOriginalButton(element, brandingLocation, showCustomBranding);

    const result = await Promise.race(promises);
    if (result || (await Promise.all(promises)).some((r) => r)) {
        return await findOrCreateShowOriginalButton(element, brandingLocation, videoID);
    }

    return null;
}

function getAndUpdateVideoBrandingInstances(videoID: VideoID, updateBranding: () => Promise<void>): VideoBrandingInstance {
    if (!videoBrandingInstances[videoID]) {
        videoBrandingInstances[videoID] = {
            showCustomBranding: Config.config?.extensionEnabled ?? true,
            updateBrandingCallbacks: [updateBranding]
        }
    } else {
        videoBrandingInstances[videoID].updateBrandingCallbacks.push(updateBranding);
    }

    return videoBrandingInstances[videoID];
}

export function toggleShowCustom(videoID: VideoID): Promise<boolean> {
    if (videoBrandingInstances[videoID]) {
        return setShowCustom(videoID, !videoBrandingInstances[videoID].showCustomBranding);
    }

    // Assume still showing, but something has gone very wrong if it gets here
    return Promise.resolve(true);
}

export async function setShowCustom(videoID: VideoID, value: boolean): Promise<boolean> {
    if (videoBrandingInstances[videoID]) {
        videoBrandingInstances[videoID].showCustomBranding = value;

        await updateBrandingForVideo(videoID);

        return value;
    }

    // Assume still showing, but something has gone very wrong if it gets here
    return true;
}

export async function updateBrandingForVideo(videoID: VideoID): Promise<void> {
    if (videoBrandingInstances[videoID]) {
        const updateBrandingCallbacks = videoBrandingInstances[videoID].updateBrandingCallbacks;
        // They will be added back to the array
        videoBrandingInstances[videoID].updateBrandingCallbacks = [];
    
        await Promise.all(updateBrandingCallbacks.map((updateBranding) => updateBranding()));
    }
}

export function clearVideoBrandingInstances(): void {
    for (const videoID in videoBrandingInstances) {
        // Only clear if it is not on the page anymore
        if (!document.querySelector(`.cbButton[videoid="${videoID}"]`)) {
            delete videoBrandingInstances[videoID];
        }
    }
}

export function startThumbnailListener(): void {
    setThumbnailListener((e) => void replaceVideoCardsBranding(e),
        () => {}, () => Config.isReady(), brandingBoxSelector); // eslint-disable-line @typescript-eslint/no-empty-function
}

export function setupOptionChangeListener(): void {
    Config.configSyncListeners.push((changes) => {
        if (changes.extensionEnabled && changes.extensionEnabled.newValue !== changes.extensionEnabled.oldValue) {
            for (const videoID in videoBrandingInstances) {
                setShowCustom(videoID as VideoID, changes.extensionEnabled.newValue).catch(logError);
            }
        }

        if (changes.titleFormatting && changes.titleFormatting.newValue !== changes.titleFormatting.oldValue) {
            for (const videoID in videoBrandingInstances) {
                const updateBrandingCallbacks = videoBrandingInstances[videoID as VideoID].updateBrandingCallbacks;
                // They will be added back to the array
                videoBrandingInstances[videoID].updateBrandingCallbacks = [];

                for (const updateBranding of updateBrandingCallbacks) {
                    updateBranding().catch(logError);
                }
            }
        }
    });
}
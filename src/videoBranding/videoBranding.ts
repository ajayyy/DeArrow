import { getYouTubeTitleNodeSelector } from "../maze-utils/elements";
import { getVideoID, VideoID } from "../maze-utils/video";
import { getElement, isVisible, waitForElement } from "../maze-utils/dom";
import { ThumbnailResult } from "../thumbnails/thumbnailData";
import { replaceThumbnail } from "../thumbnails/thumbnailRenderer";
import { TitleResult } from "../titles/titleData";
import { findOrCreateShowOriginalButton, getOrCreateTitleElement, getOriginalTitleElement, hideAndUpdateShowOriginalButton as hideAndUpdateShowOriginalButton, replaceTitle } from "../titles/titleRenderer";
import { setThumbnailListener } from "../maze-utils/thumbnailManagement";
import Config, { ThumbnailCacheOption } from "../config/config";
import { logError } from "../utils/logger";
import { getVideoTitleIncludingUnsubmitted } from "../dataFetching";
import { handleOnboarding } from "./onboarding";
import { cleanResultingTitle } from "../titles/titleFormatter";
import { shouldDefaultToCustom, shouldDefaultToCustomFastCheck, shouldUseCrowdsourcedTitles } from "../config/channelOverrides";
import { onMobile } from "../../maze-utils/src/pageInfo";

export type BrandingUUID = string & { readonly __brandingUUID: unique symbol };

export interface BrandingResult {
    titles: TitleResult[];
    thumbnails: ThumbnailResult[];
    randomTime: number | null;
    videoDuration: number | null;
}

export enum BrandingLocation {
    Related,
    Watch,
    Endcards,
    Autoplay,
    EndRecommendations
}

export type ShowCustomBrandingInfo = {
    knownValue: boolean;
    originalValue: boolean | null;
} | {
    knownValue: null;
    actualValue: Promise<boolean>;
    originalValue: boolean | null;
};

export interface VideoBrandingInstance {
    showCustomBranding: ShowCustomBrandingInfo;
    updateBrandingCallbacks: Array<() => Promise<void>>;
}

export const brandingBoxSelector = !onMobile() 
    ? "ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer, ytd-compact-radio-renderer, ytd-compact-movie-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer, ytd-grid-video-renderer, ytd-grid-movie-renderer, ytd-rich-grid-slim-media, ytd-radio-renderer, ytd-reel-item-renderer, ytd-compact-playlist-renderer, ytd-playlist-renderer, ytd-grid-playlist-renderer, ytd-grid-show-renderer"
    : "ytm-video-with-context-renderer, ytm-compact-radio-renderer, ytm-reel-item-renderer, ytm-channel-featured-video-renderer, ytm-compact-video-renderer, ytm-playlist-video-renderer, .playlist-immersive-header-content, ytm-compact-playlist-renderer, ytm-video-card-renderer, ytm-vertical-list-renderer, ytm-playlist-panel-video-renderer";

export const watchPageThumbnailSelector = ".ytp-cued-thumbnail-overlay";

const twoRingLogo = chrome.runtime.getURL("icons/logo-2r.svg");
const threeRingLogo = chrome.runtime.getURL("icons/logo.svg");

const videoBrandingInstances: Record<VideoID, VideoBrandingInstance> = {}

export async function replaceCurrentVideoBranding(): Promise<[boolean, boolean]> {
    const onWatchPage = document.URL.includes("/watch");
    const onEmbedPage = document.URL.includes("/embed/");
    const possibleSelectors = getPossibleSelectors(onWatchPage, onEmbedPage);

    // Find first invisible one, or wait for the first one to be visible
    const mainTitle = possibleSelectors.map((selector) => getElement(selector.selector, selector.checkVisibility) as HTMLElement).filter((element) => isVisible(element))[0] || 
        await waitForElement(possibleSelectors[0].selector, true) as HTMLElement;
    const titles = (possibleSelectors.map((selector) => getElement(selector.selector, selector.checkVisibility)).filter((e) => !!e)) as HTMLElement[];
    const promises: [Promise<boolean>, Promise<boolean>] = [Promise.resolve(false), Promise.resolve(false)]
    const videoID = getVideoID();

    if (videoID !== null && isVisible(mainTitle)) {
        const videoBrandingInstance = getAndUpdateVideoBrandingInstances(videoID,
            async () => { await replaceCurrentVideoBranding(); });
        const brandingLocation = BrandingLocation.Watch;
        const showCustomBranding = videoBrandingInstance.showCustomBranding;

        // Replace each title and return true only if all true
        promises[0] = Promise.all(titles.map((title) => 
            replaceTitle(title, videoID, showCustomBranding, brandingLocation)))
        .then((results) => results.every((result) => result));

        const thumbnailElement = document.querySelector(watchPageThumbnailSelector) as HTMLElement;
        if (thumbnailElement) {
            const childElement = thumbnailElement.querySelector("div");
            if (Config.config!.thumbnailCacheUse > ThumbnailCacheOption.OnAllPagesExceptWatch) {
                if (childElement) childElement.style.removeProperty("visibility");
                promises[1] = replaceThumbnail(thumbnailElement, videoID, brandingLocation, showCustomBranding);
            } else {
                if (childElement) childElement.style.setProperty("visibility", "visible", "important");
            }
        }

        // Only the first title needs a button, it will affect all titles
        if (onWatchPage) {
            void handleShowOriginalButton(titles[0], videoID, brandingLocation, showCustomBranding, promises, true);
        }
    }

    return Promise.all(promises);
}

function getPossibleSelectors(onWatchPage: boolean, onEmbedPage: boolean) {
    if (onWatchPage) {
        if (!onMobile()) {
            return [
                {
                    selector: getYouTubeTitleNodeSelector(),
                    checkVisibility: true
                },
                {
                    selector: ".ytp-title-text",
                    checkVisibility: false
                }
            ];
        } else {
            return [
                {
                    selector: getYouTubeTitleNodeSelector(),
                    checkVisibility: true
                },
                {
                    selector: ".primary-info .title",
                    checkVisibility: false
                }
            ];
        }
    } else if (onEmbedPage) {
        return [
            {
                selector: ".ytp-title-text",
                checkVisibility: false
            }
        ];
    } else {
        return [
            {
                selector: ".miniplayer #info-bar",
                checkVisibility: false
            }
        ];
    }
}

export async function replaceVideoCardsBranding(elements: HTMLElement[]): Promise<[boolean, boolean][]> {
    return await Promise.all(elements.map((e) => replaceVideoCardBranding(e, BrandingLocation.Related)));
}

export async function replaceVideoCardBranding(element: HTMLElement, brandingLocation: BrandingLocation,
        verifyVideoID?: VideoID, tries = 0): Promise<[boolean, boolean]> {
    const link = getLinkElement(element, brandingLocation);

    if (link) {
        const videoID = await extractVideoID(link);
        const isPlaylistOrClipTitleStatus = isPlaylistOrClipTitle(link);

        if (verifyVideoID && videoID !== verifyVideoID) {
            // Don't need this branding update anymore, it was trying to update for a different video
            return [false, false];
        }

        const videoBrandingInstance = getAndUpdateVideoBrandingInstances(videoID,
            async () => { await replaceVideoCardBranding(element, brandingLocation, videoID); });
        const showCustomBranding = videoBrandingInstance.showCustomBranding;

        const videoPromise = replaceThumbnail(element, videoID, brandingLocation, showCustomBranding);
        const titlePromise = !isPlaylistOrClipTitleStatus 
            ? replaceTitle(element, videoID, showCustomBranding, brandingLocation) 
            : Promise.resolve(false);

        if (isPlaylistOrClipTitleStatus) {
            // Still create title element to make sure show original button will be in the right place
            const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
            const titleElement = getOrCreateTitleElement(element, brandingLocation, originalTitleElement);

            // Force original thumbnail to be visible
            originalTitleElement.style.setProperty("display", "block", "important");
            titleElement.style.setProperty("display", "none", "important");
        }

        const promises = [videoPromise, titlePromise] as [Promise<boolean>, Promise<boolean>];

        void handleShowOriginalButton(element, videoID, brandingLocation, showCustomBranding, promises);

        const result = await Promise.all(promises);

        if (videoID !== await extractVideoID(link) && await extractVideoID(link) && tries < 2) {
            // Video ID changed, so try again
            return replaceVideoCardBranding(element, brandingLocation, verifyVideoID, tries++);
        }

        handleOnboarding(element, videoID, brandingLocation, showCustomBranding, result).catch(logError);

        return result;
    }

    return [false, false];
}

export function getLinkElement(element: HTMLElement, brandingLocation: BrandingLocation): HTMLAnchorElement {
    switch (brandingLocation) {
        case BrandingLocation.Related:
            if (!onMobile()) {
                return element.querySelector("a#thumbnail") as HTMLAnchorElement;
            } else {
                // Big thumbnails, compact thumbnails, shorts, channel feature, playlist header
                return element.querySelector("a.media-item-thumbnail-container, a.compact-media-item-image, a.reel-item-endpoint, :scope > a, .amsterdam-playlist-thumbnail-wrapper > a") as HTMLAnchorElement;
            }
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

async function extractVideoID(link: HTMLAnchorElement) {
    const videoIDRegex = link.href?.match?.(/(?:\?|&)v=(\S{11})|\/shorts\/(\S{11})/);
    let videoID = (videoIDRegex?.[1] || videoIDRegex?.[2]) as VideoID;

    if (!videoID) {
        const image = link.querySelector("yt-image img, img.video-thumbnail-img") as HTMLImageElement;
        if (image) {
            let href = image.getAttribute("src");
            if (!href) {
                // wait source to be setup
                await waitForImageSrc(image);
                href = image.getAttribute("src");
            }

            if (href) {
                videoID = href.match(/\/vi\/(\S{11})/)?.[1] as VideoID;
            }
        }
    }

    return videoID;
}

export async function extractVideoIDFromElement(element: HTMLElement, brandingLocation: BrandingLocation): Promise<VideoID | null> {
    const link = getLinkElement(element, brandingLocation);
    if (link) { 
        return await extractVideoID(link);
    } else {
        return null;
    }
}

function isPlaylistOrClipTitle(link: HTMLAnchorElement) {
    return (link.href?.match(/list=/)?.[0] !== undefined && link.href?.match(/index=/)?.[0] === undefined)
        || link.href?.match(/\/clip\//)?.[0] !== undefined;
}

export async function handleShowOriginalButton(element: HTMLElement, videoID: VideoID,
        brandingLocation: BrandingLocation, showCustomBranding: ShowCustomBrandingInfo,
        promises: [Promise<boolean>, Promise<boolean>],
        dontHide = false): Promise<void> {
    await hideAndUpdateShowOriginalButton(element, brandingLocation, showCustomBranding, dontHide);

    const result = await Promise.race(promises);
    if (result || (await Promise.all(promises)).some((r) => r)) {
        const button = await findOrCreateShowOriginalButton(element, brandingLocation, videoID);
        
        const title = await getVideoTitleIncludingUnsubmitted(videoID, brandingLocation);
        const originalTitle = getOriginalTitleElement(element, brandingLocation)?.textContent;

        const customTitle = title && !title.original 
            && (!originalTitle || (cleanResultingTitle(title.title)).toLowerCase() !== (cleanResultingTitle(originalTitle)).toLowerCase())
            && await shouldUseCrowdsourcedTitles(videoID);
        const image = button.querySelector("img") as HTMLImageElement;
        if (image) {
            if (!customTitle) {
                image.src = twoRingLogo;
                image.classList.add("cbAutoFormat");
            } else {
                image.src = threeRingLogo;
                image.classList.remove("cbAutoFormat");
            }
        }
    } else if (dontHide) {
        // Hide it now

        await hideAndUpdateShowOriginalButton(element, brandingLocation, showCustomBranding, false);
    }
}

function getAndUpdateVideoBrandingInstances(videoID: VideoID, updateBranding: () => Promise<void>): VideoBrandingInstance {
    if (!videoBrandingInstances[videoID]) {
        videoBrandingInstances[videoID] = {
            showCustomBranding: {
                knownValue: shouldDefaultToCustomFastCheck(videoID),
                actualValue: shouldDefaultToCustom(videoID),
                originalValue: shouldDefaultToCustomFastCheck(videoID)
            },
            updateBrandingCallbacks: [updateBranding]
        }
    } else {
        videoBrandingInstances[videoID].updateBrandingCallbacks.push(updateBranding);
    }

    return videoBrandingInstances[videoID];
}

export async function toggleShowCustom(videoID: VideoID): Promise<void> {
    if (videoBrandingInstances[videoID]) {
        return await setShowCustom(videoID, !await getActualShowCustomBranding(videoBrandingInstances[videoID].showCustomBranding));
    }
}

export async function setShowCustom(videoID: VideoID, value: boolean): Promise<void> {
    if (videoBrandingInstances[videoID]) {
        videoBrandingInstances[videoID].showCustomBranding = {
            knownValue: value,
            originalValue: shouldDefaultToCustomFastCheck(videoID)
        };

        await updateBrandingForVideo(videoID);
    }
}

/**
 * If a video is currently at the default state, it will be updated to it's newest state
 */
async function updateCurrentlyDefaultShowCustom(videoID: VideoID): Promise<void> {
    if (videoBrandingInstances[videoID] 
            && [null, videoBrandingInstances[videoID].showCustomBranding.originalValue]
                    .includes(videoBrandingInstances[videoID].showCustomBranding.knownValue)) {

        videoBrandingInstances[videoID].showCustomBranding = {
            knownValue: shouldDefaultToCustomFastCheck(videoID),
            actualValue: shouldDefaultToCustom(videoID),
            originalValue: shouldDefaultToCustomFastCheck(videoID)
        };
    }

    await updateBrandingForVideo(videoID);
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
    const visibleVideoIDs = [...document.querySelectorAll(".cbButton")].map((e) => e.getAttribute("videoid"));

    for (const videoID in videoBrandingInstances) {
        // Only clear if it is not on the page anymore
        if (!visibleVideoIDs.includes(videoID)) {
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
        const settingsToReloadShowCustom = [
            "defaultToCustom",
            "customConfigurations"
        ];

        if (settingsToReloadShowCustom.some((name) => (changes[name] && changes[name].newValue !== changes[name].oldValue))) {
            for (const videoID in videoBrandingInstances) {
                updateCurrentlyDefaultShowCustom(videoID as VideoID).catch(logError);
            }
        }

        const settingsToReload = [
            "extensionEnabled",
            "replaceTitles",
            "replaceThumbnails",
            "useCrowdsourcedTitles",
            "titleFormatting",
            "shouldCleanEmojis",
            "thumbnailFallback",
            "alwaysShowShowOriginalButton",
            "channelOverrides"
        ];

        if (settingsToReload.some((name) => (changes[name] && changes[name].newValue !== changes[name].oldValue))) {
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

const imagesWaitingFor = new Map<HTMLImageElement, Promise<void>>();
function waitForImageSrc(image: HTMLImageElement): Promise<void> {
    const existingPromise = imagesWaitingFor.get(image);
    if (!existingPromise) {
        const result = new Promise<void>((resolve) => {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.attributeName === "src"
                            && image.src !== "") {
                        observer.disconnect();
                        resolve();

                        imagesWaitingFor.delete(image);
                        break;
                    }
                }
            });

            observer.observe(image, { attributes: true });
        });

        imagesWaitingFor.set(image, result);

        return result;
    }

    return existingPromise;
}

export function getActualShowCustomBranding(showCustomBranding: ShowCustomBrandingInfo): Promise<boolean> {
    return showCustomBranding.knownValue === null 
        ? showCustomBranding.actualValue
        : Promise.resolve(showCustomBranding.knownValue);
}
import { getYouTubeTitleNodeSelector } from "../../maze-utils/src/elements";
import { getVideoID, isOnChannelPage, VideoID } from "../../maze-utils/src/video";
import { getElement, isVisibleOrParent, waitForElement } from "../../maze-utils/src/dom";
import { ThumbnailResult } from "../thumbnails/thumbnailData";
import { getThumbnailImageSelector, replaceThumbnail } from "../thumbnails/thumbnailRenderer";
import { getCurrentPageTitle, TitleResult } from "../titles/titleData";
import { findOrCreateShowOriginalButton, getOrCreateTitleElement, getOriginalTitleElement, hideAndUpdateShowOriginalButton as hideAndUpdateShowOriginalButton, replaceTitle } from "../titles/titleRenderer";
import { setThumbnailListener } from "../../maze-utils/src/thumbnailManagement";
import Config, { ThumbnailCacheOption } from "../config/config";
import { logError } from "../utils/logger";
import { getVideoCasualInfo, getVideoTitleIncludingUnsubmitted } from "../dataFetching";
import { handleOnboarding } from "./onboarding";
import { cleanEmojis, cleanResultingTitle } from "../titles/titleFormatter";
import { shouldDefaultToCustom, shouldDefaultToCustomFastCheck, shouldUseCrowdsourcedTitles } from "../config/channelOverrides";
import { onMobile } from "../../maze-utils/src/pageInfo";
import { addMaxTitleLinesCssToPage } from "../utils/cssInjector";
import { casualVoteButton, submitButton } from "../video";
import { waitFor } from "../../maze-utils/src";

export type BrandingUUID = string & { readonly __brandingUUID: unique symbol };

export interface BrandingResult {
    titles: TitleResult[];
    thumbnails: ThumbnailResult[];
    casualVotes: CasualVoteInfo[];
    randomTime: number | null;
    videoDuration: number | null;
}

export interface CasualVoteInfo {
    id: string;
    count: number;
    title?: string;
}

export enum BrandingLocation {
    Related,
    Watch,
    ChannelTrailer,
    Endcards,
    Autoplay,
    EndRecommendations,
    EmbedSuggestions,
    UpNextPreview,
    Notification,
    NotificationTitle
}

export type ShowCustomBrandingInfo = {
    knownValue: boolean;
    originalValue: boolean | null;
    showCasual: boolean | null;
} | {
    knownValue: null;
    actualValue: Promise<boolean>;
    originalValue: boolean | null;
    showCasual: boolean | null;
};

export interface VideoBrandingInstance {
    showCustomBranding: ShowCustomBrandingInfo;
    updateBrandingCallbacks: Array<() => Promise<void>>;
}

export const brandingBoxSelector = !onMobile() 
    ? "ytd-rich-grid-media, ytd-video-renderer, ytd-movie-renderer, ytd-compact-video-renderer, ytd-compact-radio-renderer, ytd-compact-movie-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer, ytd-grid-video-renderer, ytd-grid-movie-renderer, ytd-rich-grid-slim-media, ytd-radio-renderer, ytd-reel-item-renderer, ytd-compact-playlist-renderer, ytd-playlist-renderer, ytd-grid-playlist-renderer, ytd-grid-show-renderer, ytd-structured-description-video-lockup-renderer, ytd-hero-playlist-thumbnail-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model"
    : "ytm-video-with-context-renderer, ytm-compact-radio-renderer, ytm-reel-item-renderer, ytm-channel-featured-video-renderer, ytm-compact-video-renderer, ytm-playlist-video-renderer, .playlist-immersive-header-content, ytm-compact-playlist-renderer, ytm-video-card-renderer, ytm-vertical-list-renderer, ytm-playlist-panel-video-renderer";

export const watchPageThumbnailSelector = ".ytp-cued-thumbnail-overlay";

const twoRingLogo = chrome.runtime.getURL("icons/logo-2r.svg");
const threeRingLogo = chrome.runtime.getURL("icons/logo.svg");
const casualLogo = chrome.runtime.getURL("icons/logo-casual.svg");

const videoBrandingInstances: Record<VideoID, VideoBrandingInstance> = {}

export async function replaceCurrentVideoBranding(): Promise<[boolean, boolean]> {
    const onClipPage = document.URL.includes("/clip/");
    const onWatchPage = document.URL.includes("/watch") || onClipPage;
    const onChannelPage = isOnChannelPage();
    const onEmbedPage = document.URL.includes("/embed/");
    const possibleSelectors = getPossibleSelectors(onWatchPage, onEmbedPage, onChannelPage);

    // Find first invisible one, or wait for the first one to be visible
    const mainTitle = await (async () => {
        if (!onChannelPage) {
            const firstVisible = possibleSelectors.map((selector) => getElement(selector.selector, selector.checkVisibility, true, true) as HTMLElement)
                .filter((element) => isVisibleOrParent(element, true, true))[0];
            if (firstVisible) return firstVisible;
        }

        return await waitForElement(possibleSelectors[0].selector, !onClipPage, true, true) as HTMLElement;
    })();
    const titles = (possibleSelectors.map((selector) => getElement(selector.selector, selector.checkVisibility && !onClipPage, true, true)).filter((e) => !!e)) as HTMLElement[];
    const promises: [Promise<boolean>, Promise<boolean>] = [Promise.resolve(false), Promise.resolve(false)]
    const videoID = getVideoID();

    if (videoID !== null && (isVisibleOrParent(mainTitle, true, true) || onClipPage)) {
        const videoBrandingInstance = getAndUpdateVideoBrandingInstances(videoID,
            async () => { await replaceCurrentVideoBranding(); });
        const brandingLocation = onWatchPage ? BrandingLocation.Watch : BrandingLocation.ChannelTrailer;
        const showCustomBranding = videoBrandingInstance.showCustomBranding;

        // Replace each title and return true only if all true
        promises[0] = Promise.all(titles.map((title) => 
            replaceTitle(title, videoID, showCustomBranding, brandingLocation)))
        .then((results) => results.every((result) => result));

        waitFor(() => document.querySelector(watchPageThumbnailSelector) as HTMLElement).catch(() => null).then((thumbnailElement) => {
            if (thumbnailElement) {
                const childElement = thumbnailElement.querySelector("div");
                if (Config.config!.thumbnailCacheUse > ThumbnailCacheOption.OnAllPagesExceptWatch) {
                    if (childElement) childElement.style.removeProperty("visibility");
                    promises[1] = replaceThumbnail(thumbnailElement, videoID, brandingLocation, showCustomBranding);
                } else {
                    if (childElement) childElement.style.setProperty("visibility", "visible", "important");
                }
            }
        }).catch(logError);

        // Only the first title needs a button, it will affect all titles
        if (onWatchPage || onChannelPage) {
            void handleShowOriginalButton(titles[0], videoID, brandingLocation, showCustomBranding, promises, true);
        }
    }

    return Promise.all(promises);
}

function getPossibleSelectors(onWatchPage: boolean, onEmbedPage: boolean, onChannelPage: boolean) {
    const embedSelector = {
        selector: ".ytp-title-text, .ytPlayerOverlayVideoDetailsRendererTitle",
        checkVisibility: false
    };
    const desktopWatchSelectors = [
        {
            selector: getYouTubeTitleNodeSelector(),
            checkVisibility: true
        },
        embedSelector,
        {
            selector: "ytd-video-description-header-renderer #shorts-title",
            checkVisibility: false
        }
    ];
    const desktopMiniplayerSelector = [
        {
            selector: ".miniplayer #info-bar",
            checkVisibility: false
        }
    ];

    if (onWatchPage) {
        if (!onMobile()) {
            return desktopWatchSelectors;
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
    } else if (onChannelPage && !onMobile()) {
        // For channel trailers
        return [
            {
                selector: "ytd-channel-video-player-renderer #content #title",
                checkVisibility: true
            },
            {
                selector: "ytd-channel-video-player-renderer .ytp-title-text",
                checkVisibility: false
            }
        ].concat(desktopMiniplayerSelector);
    } else if (onEmbedPage) {
        return [embedSelector];
    } else {
        return desktopMiniplayerSelector;
    }
}

export async function replaceVideoCardsBranding(elements: HTMLElement[]): Promise<[boolean, boolean][]> {
    return await Promise.all(elements.map((e) => replaceVideoCardBranding(e, BrandingLocation.Related)));
}

export async function replaceVideoCardBranding(element: HTMLElement, brandingLocation: BrandingLocation,
        extraParams: { verifyVideoID?: VideoID; tries?: number; dontReplaceTitle?: boolean } = {}): Promise<[boolean, boolean]> {
    
    extraParams.tries ??= 0;
    const link = getLinkElement(element, brandingLocation);

    if (link) {
        const videoID = await extractVideoID(link);
        const isPlaylistOrClipTitleStatus = isPlaylistOrClipTitle(element, link);
        const isMovie = element.nodeName.includes("MOVIE");

        if (extraParams.verifyVideoID && videoID !== extraParams.verifyVideoID) {
            // Don't need this branding update anymore, it was trying to update for a different video
            return [false, false];
        }

        const videoBrandingInstance = getAndUpdateVideoBrandingInstances(videoID,
            async () => { await replaceVideoCardBranding(element, brandingLocation, { ...extraParams, verifyVideoID: videoID, tries: 0 }); });
        const showCustomBranding = videoBrandingInstance.showCustomBranding;

        const videoPromise = replaceThumbnail(element, videoID, brandingLocation, isMovie ? {
            knownValue: false,
            originalValue: false,
            showCasual: Config.config!.casualMode
        } : showCustomBranding);
        const titlePromise = !isPlaylistOrClipTitleStatus && !extraParams.dontReplaceTitle
            ? replaceTitle(element, videoID, showCustomBranding, brandingLocation) 
            : Promise.resolve(false);

        if (isPlaylistOrClipTitleStatus || extraParams.dontReplaceTitle) {
            // Still create title element to make sure show original button will be in the right place
            const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
            const titleElement = getOrCreateTitleElement(element, brandingLocation, originalTitleElement);

            // Force original thumbnail to be visible
            originalTitleElement.style.setProperty("display", "block", "important");
            titleElement.style.setProperty("display", "none", "important");
        }

        const promises = [titlePromise, videoPromise] as [Promise<boolean>, Promise<boolean>];

        void handleShowOriginalButton(element, videoID, brandingLocation, showCustomBranding, promises);

        const result = await Promise.all(promises);

        if (videoID !== await extractVideoID(link) && await extractVideoID(link) && extraParams.tries < 2) {
            // Video ID changed, so try again
            extraParams.tries++;
            return replaceVideoCardBranding(element, brandingLocation, extraParams);
        }

        if (document.hasFocus()) {
            handleOnboarding(element, videoID, brandingLocation, showCustomBranding, result).catch(logError);
        } else {
            document.addEventListener("mousemove", () => void handleOnboarding(element, videoID, brandingLocation, showCustomBranding, result).catch(logError), { once: true });
        }

        return result;
    } else {
        // Make sure thumbnail doesn't get hidden if link isn't found

        const originalThumbnail = element.querySelector(getThumbnailImageSelector(brandingLocation));
        if (originalThumbnail) {
            originalThumbnail.classList.add("cb-visible");
        }
    }

    return [false, false];
}

export function getLinkElement(element: HTMLElement, brandingLocation: BrandingLocation): HTMLAnchorElement | null {
    switch (brandingLocation) {
        case BrandingLocation.Related:
            if (!onMobile()) {
                const link = element.querySelector("a#thumbnail, a.reel-item-endpoint, a.yt-lockup-metadata-view-model-wiz__title, a.yt-lockup-metadata-view-model-wiz__title-link, a.yt-lockup-view-model-wiz__content-image") as HTMLAnchorElement;
                if (link) {
                    return link;
                } else if (element.nodeName === "YTD-HERO-PLAYLIST-THUMBNAIL-RENDERER") {
                    return element.closest("a") as HTMLAnchorElement;
                } else {
                    return null;
                }
            } else {
                // Big thumbnails, compact thumbnails, shorts, channel feature, playlist header
                return element.querySelector("a.media-item-thumbnail-container, a.compact-media-item-image, a.reel-item-endpoint, :scope > a, .amsterdam-playlist-thumbnail-wrapper > a") as HTMLAnchorElement;
            }
        case BrandingLocation.Endcards:
            return element.querySelector("a.ytp-ce-covering-overlay") as HTMLAnchorElement;
        case BrandingLocation.Autoplay:
            return element.querySelector("a.ytp-autonav-endscreen-link-container") as HTMLAnchorElement;
        case BrandingLocation.EndRecommendations:
        case BrandingLocation.EmbedSuggestions:
        case BrandingLocation.UpNextPreview:
            return element as HTMLAnchorElement;
        case BrandingLocation.Notification:
        case BrandingLocation.NotificationTitle:
            return element.querySelector("a");
        default:
            throw new Error("Invalid branding location");
    }
}

async function extractVideoID(link: HTMLAnchorElement) {
    const videoIDRegex = link.href?.match?.(/(?:\?|&)v=(\S{11})|\/shorts\/(\S{11})/);
    let videoID = (videoIDRegex?.[1] || videoIDRegex?.[2]) as VideoID;

    if (!videoID) {
        const imgBackground = link.querySelector(".ytp-tooltip-bg") as HTMLElement;
        if (imgBackground) {
            const href = imgBackground.style.backgroundImage?.match(/url\("(.+)"\)/)?.[1];
            if (href) {
                videoID = href.match(/\/vi\/(\S{11})/)?.[1] as VideoID;
            }
        } else {
            const image = link.querySelector(`yt-image img, img.video-thumbnail-img, yt-img-shadow:not([id="avatar"]) img`) as HTMLImageElement;
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

function isPlaylistOrClipTitle(element: HTMLElement, link: HTMLAnchorElement) {
    return (link.href?.match(/list=/)?.[0] !== undefined 
            && link.href?.match(/index=/)?.[0] === undefined)
        || link.href?.match(/\/clip\//)?.[0] !== undefined;
}

export async function handleShowOriginalButton(element: HTMLElement, videoID: VideoID,
        brandingLocation: BrandingLocation, showCustomBranding: ShowCustomBrandingInfo,
        promises: [Promise<boolean>, Promise<boolean>],
        dontHide = false): Promise<void> {
    await hideAndUpdateShowOriginalButton(videoID, element, brandingLocation, showCustomBranding, dontHide);

    const result = await Promise.race(promises);
    if (result || (await Promise.all(promises)).some((r) => r)) {
        const customTitle = await hasCustomTitle(videoID, element, brandingLocation);
        if (!customTitle && !Config.config!.showIconForFormattedTitles && !await promises[1]) {
            return;
        }
        
        const button = await findOrCreateShowOriginalButton(element, brandingLocation, videoID);
        const image = button.querySelector("img") as HTMLImageElement;
        if (image) {
            const shouldShowCasualTitle = await shouldShowCasual(videoID, showCustomBranding, brandingLocation);
            if (shouldShowCasualTitle && (customTitle || !Config.config!.onlyShowCasualIconForCustom)) {
                image.src = casualLogo;
                image.classList.add("cbCasualTitle");
                image.classList.remove("cbAutoFormat");
            } else if (!customTitle || (shouldShowCasualTitle && Config.config!.onlyShowCasualIconForCustom)) {
                image.src = twoRingLogo;
                image.classList.add("cbAutoFormat");
                image.classList.remove("cbCasualTitle");
            } else {
                image.src = threeRingLogo;
                image.classList.remove("cbAutoFormat");
                image.classList.remove("cbCasualTitle");
            }
        }
    } else if (dontHide) {
        // Hide it now

        await hideAndUpdateShowOriginalButton(videoID, element, brandingLocation, showCustomBranding, false);
    }
}

function getAndUpdateVideoBrandingInstances(videoID: VideoID, updateBranding: () => Promise<void>): VideoBrandingInstance {
    if (!videoBrandingInstances[videoID]) {
        videoBrandingInstances[videoID] = {
            showCustomBranding: {
                knownValue: shouldDefaultToCustomFastCheck(videoID),
                actualValue: shouldDefaultToCustom(videoID),
                originalValue: shouldDefaultToCustomFastCheck(videoID),
                showCasual: Config.config!.casualMode
            },
            updateBrandingCallbacks: [updateBranding]
        }
    } else {
        videoBrandingInstances[videoID].updateBrandingCallbacks.push(updateBranding);
    }

    return videoBrandingInstances[videoID];
}

export async function setShowCustomBasedOnDefault(videoID: VideoID, originalTitleElement: HTMLElement, brandingLocation: BrandingLocation, value: boolean): Promise<void> {
    if (videoBrandingInstances[videoID]) {
        const showThreeStages = await showThreeShowOriginalStages(videoID, originalTitleElement, brandingLocation);
        const alwaysShowCustom = showThreeStages && Config.config!.showOriginalOnHover && Config.config!.showCustomOnHoverIfCasual;

        // If value true, use default, otherwise use opposite of default
        return await internalSetShowCustom(videoID, originalTitleElement, brandingLocation,
            alwaysShowCustom || (!!videoBrandingInstances[videoID].showCustomBranding.originalValue === value),
                showThreeStages ? value : undefined);
    }
}

export async function toggleShowCustom(videoID: VideoID, originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): Promise<void> {
    if (videoBrandingInstances[videoID]) {
        const shouldShowCustom = await getActualShowCustomBranding(videoBrandingInstances[videoID].showCustomBranding);
        if (await showThreeShowOriginalStages(videoID, originalTitleElement, brandingLocation)) {
            // casual -> custom -> original
            if (videoBrandingInstances[videoID].showCustomBranding.showCasual) {
                // Go to custom
                return await internalSetShowCustom(videoID, originalTitleElement, brandingLocation, true, false);
            } else {
                if (shouldShowCustom) {
                    // Go to original
                    return await internalSetShowCustom(videoID, originalTitleElement, brandingLocation, false, false);
                } else {
                    if (!Config.config!.showOriginalOnHover) {
                        // Go to casual
                        return await internalSetShowCustom(videoID, originalTitleElement, brandingLocation, true, true);
                    } else {
                        // Go to custom when clicking after hovering to show original
                        return await internalSetShowCustom(videoID, originalTitleElement, brandingLocation, true, false);
                    }
                }
            }
        } else {
            return await internalSetShowCustom(videoID, originalTitleElement, brandingLocation, !shouldShowCustom);
        }
    }
}

async function internalSetShowCustom(videoID: VideoID, originalTitleElement: HTMLElement, brandingLocation: BrandingLocation, value: boolean, showCasual?: boolean): Promise<void> {
    if (videoBrandingInstances[videoID]) {
        if (showCasual == undefined) {
            // When defaulting to original titles, only show casual mode icon when there is a custom title
            // Also show casual mode icon when defaulting to original and showing original
            const customTitle = await hasCustomTitleWithOriginalTitle(videoID, originalTitleElement, brandingLocation);
            showCasual = await shouldDefaultToCustom(videoID) || !customTitle || (!(await shouldDefaultToCustom(videoID)) && !value);
        }

        videoBrandingInstances[videoID].showCustomBranding = {
            knownValue: value,
            originalValue: shouldDefaultToCustomFastCheck(videoID),
            showCasual: showCasual
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
            originalValue: shouldDefaultToCustomFastCheck(videoID),
            showCasual: Config.config!.casualMode
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
            "casualMode",
            "replaceTitles",
            "replaceThumbnails",
            "useCrowdsourcedTitles",
            "titleFormatting",
            "shouldCleanEmojis",
            "thumbnailSaturationLevel",
            "onlyTitleCaseInEnglish",
            "thumbnailFallback",
            "thumbnailFallbackAutogenerated",
            "alwaysShowShowOriginalButton",
            "channelOverrides",
            "showIconForFormattedTitles",
            "ignoreAbThumbnails",
            "showOriginalOnHover",
            "showLiveCover",
            "onlyFormatCustomTitles"
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

            if (changes["extensionEnabled"]) {
                submitButton.updateIcon();
                casualVoteButton.updateIcon();
            } else if (changes["casualMode"]) {
                casualVoteButton.updateIcon();
            }
        }

        if (changes.titleMaxLines 
                && changes.titleMaxLines.newValue !== changes.titleMaxLines.oldValue) {
            addMaxTitleLinesCssToPage();
        }
    });
}

const imagesWaitingFor = new Map<HTMLImageElement, Promise<void>>();
function waitForImageSrc(image: HTMLImageElement): Promise<void> {
    const existingPromise = imagesWaitingFor.get(image);
    if (!existingPromise) {
        const result = new Promise<void>((resolve) => {
            const observer = new MutationObserver((mutations) => {
                if (!chrome.runtime?.id) return;

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

async function hasCustomTitleWithOriginalTitle(videoID: VideoID, originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): Promise<boolean> {
    const title = await getVideoTitleIncludingUnsubmitted(videoID, brandingLocation);
    const originalTitle = originalTitleElement?.textContent;
    const customTitle = title && !title.original 
        && (!originalTitle || (cleanResultingTitle(cleanEmojis(title.title))).toLowerCase() !== (cleanResultingTitle(cleanEmojis(originalTitle))).toLowerCase())
        && await shouldUseCrowdsourcedTitles(videoID);

    return !!customTitle;
}

export async function hasCustomTitle(videoID: VideoID, element: HTMLElement, brandingLocation: BrandingLocation): Promise<boolean> {
    return await hasCustomTitleWithOriginalTitle(videoID, getOriginalTitleElement(element, brandingLocation), brandingLocation);
}

export function getActualShowCustomBranding(showCustomBranding: ShowCustomBrandingInfo): Promise<boolean> {
    return showCustomBranding.knownValue === null 
        ? showCustomBranding.actualValue
        : Promise.resolve(showCustomBranding.knownValue);
}

export async function shouldShowCasual(videoID: VideoID, showCustomBranding: ShowCustomBrandingInfo, brandingLocation: BrandingLocation): Promise<boolean> {
    return !!showCustomBranding.showCasual && await shouldShowCasualOnVideo(videoID, brandingLocation);
}

export async function shouldShowCasualOnVideo(videoID: VideoID, brandingLocation: BrandingLocation): Promise<boolean> {
    if (!Config.config!.casualMode) return false;

    const unsubmittedInfo = Config.local!.unsubmitted[videoID];
    if (unsubmittedInfo && unsubmittedInfo.casual !== undefined) {
        return unsubmittedInfo.casual;
    }

    const currentPageTitle = getCurrentPageTitle();
    const casualInfo = (await getVideoCasualInfo(videoID, brandingLocation))
        .filter((v) => !v.title || v.title.toLowerCase() === currentPageTitle?.toLowerCase());
    for (const category of casualInfo) {
        const configAmount = Config.config!.casualModeSettings[category.id];
        if (configAmount && category.count >= configAmount) {
            return true;
        }
    }
    return false;
}

export async function showThreeShowOriginalStages(videoID: VideoID, originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): Promise<boolean> {
    return await shouldShowCasualOnVideo(videoID, brandingLocation)
        && await hasCustomTitleWithOriginalTitle(videoID, originalTitleElement, brandingLocation)
        && await shouldDefaultToCustom(videoID);
}
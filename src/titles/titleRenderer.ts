import { VideoID, getVideoID } from "../maze-utils/video";
import Config from "../config/config";
import { getVideoTitleIncludingUnsubmitted } from "../dataFetching";
import { logError } from "../utils/logger";
import { MobileFix, addNodeToListenFor, getOrCreateTitleButtonContainer } from "../utils/titleBar";
import { BrandingLocation, ShowCustomBrandingInfo, extractVideoIDFromElement, getActualShowCustomBranding, toggleShowCustom } from "../videoBranding/videoBranding";
import { formatTitle } from "./titleFormatter";
import { setCurrentVideoTitle } from "./pageTitleHandler";
import { shouldDefaultToCustom, shouldReplaceTitles, shouldReplaceTitlesFastCheck, shouldUseCrowdsourcedTitles } from "../config/channelOverrides";
import { countTitleReplacement } from "../config/stats";
import { isReduxInstalled } from "../utils/extensionCompatibility";
import { onMobile } from "../../maze-utils/src/pageInfo";
import { isFirefoxOrSafari } from "../maze-utils";
import { isSafari } from "../maze-utils/config";

enum WatchPageType {
    Video,
    Miniplayer
}

let lastWatchTitle = "";
let lastWatchVideoID: VideoID | null = null;
let lastUrlWatchPageType: WatchPageType | null = null;

export async function replaceTitle(element: HTMLElement, videoID: VideoID, showCustomBranding: ShowCustomBrandingInfo, brandingLocation: BrandingLocation): Promise<boolean> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);

    if (!Config.config!.extensionEnabled || shouldReplaceTitlesFastCheck(videoID) === false) {
        showOriginalTitle(element, brandingLocation);
        return false;
    }
    
    if (brandingLocation === BrandingLocation.Watch) {
        const currentWatchPageType = document.URL.includes("watch") ? WatchPageType.Video : WatchPageType.Miniplayer;

        if (lastWatchVideoID && originalTitleElement?.textContent 
                && videoID !== lastWatchVideoID && originalTitleElement.textContent === lastWatchTitle
                && lastUrlWatchPageType === currentWatchPageType) {
            // Don't reset it if it hasn't changed videos yet, will be handled by title change listener
            return false;
        }

        lastWatchTitle = originalTitleElement?.textContent ?? "";
        lastWatchVideoID = videoID;
        lastUrlWatchPageType = currentWatchPageType;
    }

    //todo: add an option to not hide title
    hideCustomTitle(element, brandingLocation);
    hideOriginalTitle(element, brandingLocation);

    try {
        const titleData = await getVideoTitleIncludingUnsubmitted(videoID, brandingLocation);
        if (!await isOnCorrectVideo(element, brandingLocation, videoID)) return false;

        const title = titleData?.title;
        if (title && await shouldUseCrowdsourcedTitles(videoID)) {
            const formattedTitle = await formatTitle(title, true, videoID);
            if (!await isOnCorrectVideo(element, brandingLocation, videoID)) return false;

            if (originalTitleElement?.textContent 
                    && originalTitleElement.textContent.trim() === formattedTitle) {
                showOriginalTitle(element, brandingLocation);
                return false;
            }
            
            if (onMobile()) {
                hideOriginalTitle(element, brandingLocation);
            }
            
            setCustomTitle(formattedTitle, element, brandingLocation);
            countTitleReplacement(videoID);
        } else if (originalTitleElement?.textContent) {
            // innerText is blank when visibility hidden
            const originalText = originalTitleElement.textContent.trim();
            const modifiedTitle = await formatTitle(originalText, false, videoID);
            if (!await isOnCorrectVideo(element, brandingLocation, videoID)) return false;

            if (originalText === modifiedTitle) {
                showOriginalTitle(element, brandingLocation);
                return false;
            }

            setCustomTitle(modifiedTitle, element, brandingLocation);
        } else {
            showOriginalTitle(element, brandingLocation);
        }

        if (originalTitleElement.parentElement?.title) {
            // Inside element should handle title fine
            originalTitleElement.parentElement.title = "";
        }

        showCustomTitle(element, brandingLocation);

        if (!await getActualShowCustomBranding(showCustomBranding)) {
            showOriginalTitle(element, brandingLocation);
        }

        if (!await shouldReplaceTitles(videoID)) {
            showOriginalTitle(element, brandingLocation);
            return false;
        }

        return true;
    } catch (e) {
        logError(e);
        showOriginalTitle(element, brandingLocation);

        return false;
    }
}

async function isOnCorrectVideo(element: HTMLElement, brandingLocation: BrandingLocation, videoID: VideoID): Promise<boolean> {
    return brandingLocation === BrandingLocation.Watch ? getVideoID() === videoID 
        : await extractVideoIDFromElement(element, brandingLocation) === videoID;
}

function hideOriginalTitle(element: HTMLElement, brandingLocation: BrandingLocation) {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    originalTitleElement.style.display = "none";

    switch(brandingLocation) {
        case BrandingLocation.Watch: {
            setCurrentVideoTitle("");
            break;
        }
    }
}

function showOriginalTitle(element: HTMLElement, brandingLocation: BrandingLocation) {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const titleElement = getOrCreateTitleElement(element, brandingLocation, originalTitleElement);
    
    titleElement.style.display = "none";
    if (isReduxInstalled()) {
        originalTitleElement.style.setProperty("display", "-webkit-box", "important");
    } else {
        originalTitleElement.style.setProperty("display", "inline", "important");
    }

    switch(brandingLocation) {
        case BrandingLocation.Watch: {
            if (originalTitleElement.classList.contains("ytd-miniplayer")) {
                originalTitleElement.style.setProperty("display", "inline-block", "important");
            }

            setCurrentVideoTitle(originalTitleElement.textContent ?? "");
            break;
        }
        default: {
            originalTitleElement.title = originalTitleElement.textContent?.trim() ?? "";
            break;
        }
    }
}

function hideCustomTitle(element: HTMLElement, brandingLocation: BrandingLocation) {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const titleElement = getOrCreateTitleElement(element, brandingLocation, originalTitleElement);

    titleElement.style.display = "none";
}

function showCustomTitle(element: HTMLElement, brandingLocation: BrandingLocation) {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const titleElement = getOrCreateTitleElement(element, brandingLocation, originalTitleElement);
    titleElement.style.removeProperty("display");

    if (titleElement.nodeName === "A") {
        titleElement.setAttribute("href", originalTitleElement.getAttribute("href") ?? "");
    }

    switch(brandingLocation) {
        case BrandingLocation.Watch: {
            setCurrentVideoTitle(titleElement.textContent ?? "");
            break;
        }
    }
}

function setCustomTitle(title: string, element: HTMLElement, brandingLocation: BrandingLocation) {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const titleElement = getOrCreateTitleElement(element, brandingLocation, originalTitleElement);
    titleElement.innerText = title;
    titleElement.title = title;

    switch(brandingLocation) {
        case BrandingLocation.Watch: {
            setCurrentVideoTitle(title);
            break;
        }
    }
}

export function getOriginalTitleElement(element: HTMLElement, brandingLocation: BrandingLocation) {
    return element.querySelector(getTitleSelector(brandingLocation)
        .map((s) => `${s}:not(.cbCustomTitle)`).join(", ")) as HTMLElement;
}

function getTitleSelector(brandingLocation: BrandingLocation): string[] {
    switch (brandingLocation) {
        case BrandingLocation.Watch:
            return [
                "yt-formatted-string", 
                ".ytp-title-link.yt-uix-sessionlink",
                ".yt-core-attributed-string"
            ];
        case BrandingLocation.Related:
            return [
                "#video-title",
                ".details .media-item-headline .yt-core-attributed-string", // Mobile YouTube
                ".reel-item-metadata h3 .yt-core-attributed-string", // Mobile YouTube Shorts
                ".details > .yt-core-attributed-string", // Mobile YouTube Channel Feature
                ".compact-media-item-headline .yt-core-attributed-string", // Mobile YouTube Compact,
                ".amsterdam-playlist-title .yt-core-attributed-string", // Mobile YouTube Playlist Header,
                ".autonav-endscreen-video-title .yt-core-attributed-string", // Mobile YouTube Autoplay
                ".video-card-title .yt-core-attributed-string", // Mobile YouTube History List
            ];
        case BrandingLocation.Endcards:
            return [".ytp-ce-video-title", ".ytp-ce-playlist-title"];
        case BrandingLocation.Autoplay:
            return [".ytp-autonav-endscreen-upnext-title"];
        case BrandingLocation.EndRecommendations:
            return [".ytp-videowall-still-info-title"];
        case BrandingLocation.EmbedSuggestions:
            return [".ytp-suggestion-title"];
        default:
            throw new Error("Invalid branding location");
    }
}

export function getOrCreateTitleElement(element: HTMLElement, brandingLocation: BrandingLocation, originalTitleElement?: HTMLElement): HTMLElement {
    return element.querySelector(".cbCustomTitle") as HTMLElement ?? 
        createTitleElement(element, originalTitleElement ?? getOriginalTitleElement(element, brandingLocation), brandingLocation);
}

function createTitleElement(element: HTMLElement, originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): HTMLElement {
    const titleElement = brandingLocation !== BrandingLocation.Watch || originalTitleElement.classList.contains("miniplayer-title")
        ? originalTitleElement.cloneNode() as HTMLElement 
        : document.createElement("span");
    titleElement.classList.add("cbCustomTitle");

    if (brandingLocation === BrandingLocation.EndRecommendations
            || brandingLocation === BrandingLocation.Autoplay
            || brandingLocation === BrandingLocation.EmbedSuggestions) {
        const container = document.createElement("div");
        container.appendChild(titleElement);
        originalTitleElement.parentElement?.prepend(container);

        // Move original title element over to this element
        container.prepend(originalTitleElement);
    } else {
        if (!onMobile()) {
            originalTitleElement.parentElement?.insertBefore(titleElement, originalTitleElement);
        } else {
            originalTitleElement.parentElement?.insertBefore(titleElement, originalTitleElement.nextSibling);
        }
    }

    if (brandingLocation !== BrandingLocation.Watch) {
        const smallBrandingBox = !!titleElement.closest("ytd-grid-video-renderer");

        // To be able to show the show original button in the right place
        titleElement.parentElement!.style.display = "flex";
        titleElement.parentElement!.style.alignItems = "center";
        if (smallBrandingBox) titleElement.parentElement!.style.alignItems = "flex-start";
        if (onMobile()) titleElement.parentElement!.style.alignItems = "normal";
        titleElement.parentElement!.style.justifyContent = "space-between";
        titleElement.parentElement!.style.width = "100%";

        if (brandingLocation === BrandingLocation.Related) {
            // Move badges out of centered div
            const badges = titleElement.parentElement!.querySelectorAll("ytd-badge-supported-renderer");
            for (const badge of badges) {
                badge.parentElement!.parentElement!.prepend(badge);
            }
        }

        if (brandingLocation === BrandingLocation.Endcards) {
            titleElement.parentElement!.style.height = "auto";

            // Move duration out of centered div
            const durationElement = titleElement.parentElement!.querySelector(".ytp-ce-video-duration");
            if (durationElement) {
                titleElement.parentElement!.parentElement!.appendChild(durationElement);
            }
        }

        // For channel pages to make sure the show original button can be on the right
        const metaElement = element.querySelector("#meta") as HTMLElement;
        if (metaElement && !smallBrandingBox) {
            metaElement.style.width = "100%";
        }
    }

    if (brandingLocation === BrandingLocation.Watch) {
        // For mini player title
        titleElement.removeAttribute("is-empty");

        if (onMobile()) {
            titleElement.parentElement!.style.alignItems = "center";
            if (isFirefoxOrSafari() && !isSafari()) {
                titleElement.style.width = "-moz-available";
                originalTitleElement.style.width = "-moz-available";
            } else {
                titleElement.style.width = "-webkit-fill-available";
                originalTitleElement.style.width = "-webkit-fill-available";
            }

            addNodeToListenFor(titleElement, MobileFix.Replace);
            addNodeToListenFor(originalTitleElement, MobileFix.CopyStyles);
        }
    } else {
        if (onMobile()) {
            addNodeToListenFor(titleElement, MobileFix.Replace);
        }
    }

    return titleElement;
}

export async function hideAndUpdateShowOriginalButton(element: HTMLElement, brandingLocation: BrandingLocation,
        showCustomBranding: ShowCustomBrandingInfo, dontHide: boolean): Promise<void> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const buttonElement = await findShowOriginalButton(originalTitleElement, brandingLocation);
    if (buttonElement) {
        const buttonImage = buttonElement.querySelector(".cbShowOriginalImage") as HTMLElement;
        if (buttonImage) {
            if (await getActualShowCustomBranding(showCustomBranding)) {
                buttonImage.classList.remove("cbOriginalShown");
                buttonElement.title = chrome.i18n.getMessage("ShowOriginal");
            } else {
                buttonImage.classList.add("cbOriginalShown");
                buttonElement.title = chrome.i18n.getMessage("ShowModified");
            }

            const isDefault = showCustomBranding.knownValue === null 
                || showCustomBranding.knownValue === showCustomBranding.originalValue;
            if (isDefault
                    && brandingLocation !== BrandingLocation.Watch
                    && !Config.config!.alwaysShowShowOriginalButton) {
                buttonElement.classList.remove("cbDontHide");
            } else {
                buttonElement.classList.add("cbDontHide");
            }
        }

        if (!dontHide) buttonElement.style.setProperty("display", "none", "important");
    }
}

export async function findShowOriginalButton(originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): Promise<HTMLElement> {
    const referenceNode = brandingLocation === BrandingLocation.Watch 
        ? (await getOrCreateTitleButtonContainer()) : originalTitleElement.parentElement;
    return referenceNode?.querySelector?.(".cbShowOriginal") as HTMLElement;
}

export async function findOrCreateShowOriginalButton(element: HTMLElement, brandingLocation: BrandingLocation,
        videoID: VideoID): Promise<HTMLElement> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const buttonElement = await findShowOriginalButton(originalTitleElement, brandingLocation) 
        ?? await createShowOriginalButton(originalTitleElement, brandingLocation, videoID);

    buttonElement.setAttribute("videoID", videoID);
    buttonElement.style.removeProperty("display");
    return buttonElement;
}

async function createShowOriginalButton(originalTitleElement: HTMLElement,
        brandingLocation: BrandingLocation, videoID: VideoID): Promise<HTMLElement> {
    const buttonElement = document.createElement("button");
    buttonElement.classList.add("cbShowOriginal");
    if (onMobile()) buttonElement.classList.add("cbMobileButton");

    buttonElement.classList.add("cbButton");
    if (brandingLocation === BrandingLocation.Watch 
            || Config.config!.alwaysShowShowOriginalButton) {
        buttonElement.classList.add("cbDontHide");
    }

    const buttonImage = document.createElement("img");
    buttonElement.draggable = false;
    buttonImage.className = "cbShowOriginalImage";
    buttonImage.src = chrome.runtime.getURL("icons/logo.svg");
    buttonElement.appendChild(buttonImage);

    if (!await shouldDefaultToCustom(videoID)) {
        buttonImage.classList.add("cbOriginalShown");
        buttonElement.title = chrome.i18n.getMessage("ShowModified");
    } else {
        buttonElement.title = chrome.i18n.getMessage("ShowOriginal");
    }

    const getHoverPlayers = () => [
        originalTitleElement.closest("#dismissible")?.querySelector?.("#mouseover-overlay") as HTMLElement,
        document.querySelector("ytd-video-preview #player-container") as HTMLElement
    ];

    buttonElement.addEventListener("click", (e) => void (async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const videoID = buttonElement.getAttribute("videoID");
        if (videoID) {
            await toggleShowCustom(videoID as VideoID);

            // Hide hover play, made visible again when mouse leaves area
            for (const player of getHoverPlayers()) {
                if (player) {
                    player.style.display = "none";
                    const hoverPlayerVideo = player.querySelector("video");
                    if (hoverPlayerVideo) {
                        hoverPlayerVideo.pause();
                    }
                }
            }
        }
    })(e));

    if (originalTitleElement.parentElement) {
        originalTitleElement.parentElement.addEventListener("mouseleave", () => {
            if (!chrome.runtime?.id) return; // Extension context invalidated

            for (const player of getHoverPlayers()) {
                if (player) {
                    player.style.removeProperty("display");

                    const hoverPlayerVideo = player.querySelector("video");
                    if (hoverPlayerVideo && hoverPlayerVideo.paused) {
                        hoverPlayerVideo.play().catch(logError);
                    }
                }
            }
        });
    }

    if (brandingLocation === BrandingLocation.Watch) {
        const referenceNode = await getOrCreateTitleButtonContainer();
        
        // Verify again it doesn't already exist
        const existingButton = referenceNode?.querySelector?.(".cbShowOriginal");
        if (existingButton) {
            buttonElement.remove();
            return existingButton as HTMLElement;
        }

        referenceNode?.prepend?.(buttonElement);
    } else {
        // Verify again it doesn't already exist
        const existingButton = originalTitleElement.parentElement?.querySelector?.(".cbShowOriginal");
        if (existingButton) {
            buttonElement.remove();
            return existingButton as HTMLElement;
        }

        originalTitleElement.parentElement?.appendChild(buttonElement);
    }

    if (onMobile()) {
        addNodeToListenFor(buttonElement, MobileFix.Replace);

        buttonElement.classList.add("cbMobile");

        // Add hover to show
        const box = buttonElement.closest(".details, .compact-media-item-metadata, .reel-item-metadata");
        if (box) {
            let readyToHide = false;
            box.addEventListener("touchstart", () => {
                if (!chrome.runtime?.id) return; // Extension context invalidated
                readyToHide = false;

                if (!buttonElement.classList.contains("cbDontHide")) {
                    buttonElement.classList.add("cbMobileDontHide");
                }
            });

            box.addEventListener("touchend", () => {
                if (!chrome.runtime?.id) return; // Extension context invalidated
                readyToHide = true;
            });

            box.addEventListener("contextmenu", () => {
                if (!chrome.runtime?.id) return; // Extension context invalidated
                readyToHide = true;
            });

            document.addEventListener("touchstart", () => {
                if (!chrome.runtime?.id) return; // Extension context invalidated
                if (readyToHide) {
                    buttonElement.classList.remove("cbMobileDontHide");

                    readyToHide = false;
                }
            });
        }
    }

    return buttonElement;
}
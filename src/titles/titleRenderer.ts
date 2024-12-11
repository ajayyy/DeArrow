import { VideoID, getVideoID } from "../../maze-utils/src/video";
import Config, { TitleFormatting } from "../config/config";
import { getVideoTitleIncludingUnsubmitted } from "../dataFetching";
import { logError } from "../utils/logger";
import { MobileFix, addNodeToListenFor, getOrCreateTitleButtonContainer } from "../utils/titleBar";
import { BrandingLocation, ShowCustomBrandingInfo, extractVideoIDFromElement, getActualShowCustomBranding, toggleShowCustom } from "../videoBranding/videoBranding";
import { cleanEmojis, formatTitle } from "./titleFormatter";
import { setCurrentVideoTitle } from "./pageTitleHandler";
import { getTitleFormatting, shouldCleanEmojis, shouldDefaultToCustom, shouldReplaceTitles, shouldReplaceTitlesFastCheck, shouldUseCrowdsourcedTitles } from "../config/channelOverrides";
import { countTitleReplacement } from "../config/stats";
import { onMobile } from "../../maze-utils/src/pageInfo";
import { isFirefoxOrSafari, waitFor } from "../../maze-utils/src";
import { isSafari } from "../../maze-utils/src/config";
import { notificationToTitle, titleToNotificationFormat } from "../videoBranding/notificationHandler";

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

        if (lastWatchVideoID && getOriginalTitleText(originalTitleElement, brandingLocation)
                && videoID !== lastWatchVideoID && getOriginalTitleText(originalTitleElement, brandingLocation) === lastWatchTitle
                && lastUrlWatchPageType === currentWatchPageType) {
            // Don't reset it if it hasn't changed videos yet, will be handled by title change listener
            return false;
        }

        if (lastWatchVideoID !== videoID) {
            lastWatchTitle = getOriginalTitleText(originalTitleElement, brandingLocation);
            lastWatchVideoID = videoID;
            lastUrlWatchPageType = currentWatchPageType;
        }
    }

    if (Config.config!.hideDetailsWhileFetching) {
        hideCustomTitle(element, brandingLocation);
        hideOriginalTitle(element, brandingLocation);
    } else {
        showOriginalTitle(element, brandingLocation);
        hideCustomTitle(element, brandingLocation);
    }

    try {
        const titleDataPromise = getVideoTitleIncludingUnsubmitted(videoID, brandingLocation);
        // Wait for whatever is first
        await Promise.race([
            titleDataPromise,
            shouldReplaceTitles(videoID)
        ]);

        if (shouldReplaceTitlesFastCheck(videoID) === false) {
            showOriginalTitle(element, brandingLocation);
            return false;
        }

        // Will keep waiting for the title if the channel check finished first
        const titleData = await titleDataPromise;
        if (!await isOnCorrectVideo(element, brandingLocation, videoID)) return false;

        const title = titleData?.title;
        const originalTitle = getOriginalTitleText(originalTitleElement, brandingLocation).trim();
        if (title && await shouldUseCrowdsourcedTitles(videoID)
                // If there are just formatting changes, and the user doesn't want those, don't replace
                && (await getTitleFormatting(videoID) !== TitleFormatting.Disable || originalTitle.toLowerCase() !== title.toLowerCase())
                && (await getTitleFormatting(videoID) !== TitleFormatting.Disable 
                    || await shouldCleanEmojis(videoID) || cleanEmojis(originalTitle.toLowerCase()) !== cleanEmojis(title.toLowerCase()))) {
            const formattedTitle = await formatTitle(title, true, videoID);
            if (!await isOnCorrectVideo(element, brandingLocation, videoID)) return false;

            if (getOriginalTitleText(originalTitleElement, brandingLocation) 
                    && getOriginalTitleText(originalTitleElement, brandingLocation).trim() === formattedTitle) {
                showOriginalTitle(element, brandingLocation);
                return false;
            }
            
            if (onMobile()) {
                hideOriginalTitle(element, brandingLocation);
            }
            
            setCustomTitle(formattedTitle, element, brandingLocation);
            countTitleReplacement(videoID);
        } else {
            // innerText is blank when visibility hidden
            if (getOriginalTitleText(originalTitleElement, brandingLocation).length === 0) {
                await waitFor(() => originalTitleElement!.textContent!.length > 0, 5000).catch(() => null);
            }

            if (getOriginalTitleText(originalTitleElement, brandingLocation)) {
                const originalText = getOriginalTitleText(originalTitleElement, brandingLocation).trim();
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
        }
        if (originalTitleElement.parentElement?.title) {
            // Inside element should handle title fine
            originalTitleElement.parentElement.title = "";
        }
        if (originalTitleElement.parentElement?.parentElement?.title) {
            // Inside element should handle title fine
            originalTitleElement.parentElement.parentElement.title = "";
        }

        if (!Config.config!.hideDetailsWhileFetching) {
            hideOriginalTitle(element, brandingLocation);
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

export async function isOnCorrectVideo(element: HTMLElement, brandingLocation: BrandingLocation, videoID: VideoID): Promise<boolean> {
    return [BrandingLocation.Watch, BrandingLocation.ChannelTrailer].includes(brandingLocation) ? getVideoID() === videoID 
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
    if (originalTitleElement.classList.contains("ta-title-container")) {
        // Compatibility with Tube Archivist
        originalTitleElement.style.setProperty("display", "flex", "important");
    } else if (
            originalTitleElement.parentElement?.classList.contains("ytd-channel-video-player-renderer")
            || originalTitleElement.classList.contains("ytp-title-link")) {
        originalTitleElement.style.removeProperty("display");
    } else {
        originalTitleElement.style.setProperty("display", "-webkit-box", "important");
    }

    if (Config.config!.showOriginalOnHover) {
        findShowOriginalButton(originalTitleElement, brandingLocation).then((buttonElement) => {
            if (buttonElement) {
                buttonElement.title = getOriginalTitleText(originalTitleElement, brandingLocation);
            }
        }).catch(logError);
    }

    switch(brandingLocation) {
        case BrandingLocation.Watch: {
            if (originalTitleElement.classList.contains("ytd-miniplayer")) {
                originalTitleElement.style.setProperty("display", "inline-block", "important");
            }

            setCurrentVideoTitle(getOriginalTitleText(originalTitleElement, brandingLocation));
            break;
        }
        default: {
            originalTitleElement.title = getOriginalTitleText(originalTitleElement, brandingLocation).trim();
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
        const href = originalTitleElement.getAttribute("href");
        if (href) {
            titleElement.setAttribute("href", href);
        }
    }

    if (Config.config!.showOriginalOnHover) {
        findShowOriginalButton(originalTitleElement, brandingLocation).then((buttonElement) => {
            if (buttonElement) {
                buttonElement.title = titleElement.textContent ?? "";
            }
        }).catch(logError);
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

    if (brandingLocation === BrandingLocation.Notification) {
        title = titleToNotificationFormat(title, originalTitleElement?.textContent ?? "");
    }

    // To support extensions like Tube Archivist that add nodes
    const children = titleElement.childNodes;
    if (children.length > 1) {
        let foundNode = false;
        for (const child of children) {
            if (child.nodeType === Node.TEXT_NODE) {
                foundNode = true;
                child.nodeValue = title;
                break;
            }
        }

        if (!foundNode) {
            titleElement.prepend(document.createTextNode(title));
        }
    } else {
        titleElement.innerText = title;
    }
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
                "#movie-title", // Movies in related
                "#description #title", // Related videos in description
                ".yt-lockup-metadata-view-model-wiz__title .yt-core-attributed-string", // New desktop related
                ".ShortsLockupViewModelHostMetadataTitle .yt-core-attributed-string", // New desktop shorts
                ".details .media-item-headline .yt-core-attributed-string", // Mobile YouTube
                ".reel-item-metadata h3 .yt-core-attributed-string", // Mobile YouTube Shorts
                ".details > .yt-core-attributed-string", // Mobile YouTube Channel Feature
                ".compact-media-item-headline .yt-core-attributed-string", // Mobile YouTube Compact,
                ".amsterdam-playlist-title .yt-core-attributed-string", // Mobile YouTube Playlist Header,
                ".autonav-endscreen-video-title .yt-core-attributed-string", // Mobile YouTube Autoplay
                ".video-card-title .yt-core-attributed-string", // Mobile YouTube History List
            ];
        case BrandingLocation.ChannelTrailer:
            return [
                "yt-formatted-string", 
                ".ytp-title-link.yt-uix-sessionlink",
                ".yt-core-attributed-string",
                "a.yt-formatted-string", // Channel trailers
            ];
        case BrandingLocation.Endcards:
            return [".ytp-ce-video-title", ".ytp-ce-playlist-title"];
        case BrandingLocation.Autoplay:
            return [".ytp-autonav-endscreen-upnext-title"];
        case BrandingLocation.EndRecommendations:
            return [".ytp-videowall-still-info-title"];
        case BrandingLocation.EmbedSuggestions:
            return [".ytp-suggestion-title"];
        case BrandingLocation.UpNextPreview:
            return [
                ".ytp-tooltip-text-no-title",
                ".ytp-tooltip-text"
            ];
        case BrandingLocation.Notification:
            return [".text yt-formatted-string"]
        default:
            throw new Error("Invalid branding location");
    }
}

export function getOrCreateTitleElement(element: HTMLElement, brandingLocation: BrandingLocation, originalTitleElement?: HTMLElement): HTMLElement {
    return element.querySelector(".cbCustomTitle") as HTMLElement ?? 
        createTitleElement(element, originalTitleElement ?? getOriginalTitleElement(element, brandingLocation), brandingLocation);
}

function createTitleElement(element: HTMLElement, originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): HTMLElement {
    const titleElement = brandingLocation !== BrandingLocation.Watch 
            || originalTitleElement.classList.contains("miniplayer-title")
            || originalTitleElement.classList.contains("ytp-title-link")
        ? originalTitleElement.cloneNode() as HTMLElement 
        : document.createElement("span");

    if (brandingLocation === BrandingLocation.ChannelTrailer && originalTitleElement.classList.contains("yt-formatted-string")) {
        // YouTube gets confused and starts using the custom one as original
        titleElement.className = "";

        titleElement.style.color = "var(--yt-endpoint-visited-color,var(--yt-spec-text-primary))";
        titleElement.style.textDecoration = "none";
    }

    if (brandingLocation === BrandingLocation.Notification) {
        // For some reason you have to set before removing
        titleElement.setAttribute("is-empty", "");
        titleElement.removeAttribute("is-empty");
    }

    titleElement.classList.add("cbCustomTitle");

    if (brandingLocation === BrandingLocation.EndRecommendations
            || brandingLocation === BrandingLocation.Autoplay
            || brandingLocation === BrandingLocation.EmbedSuggestions
            || brandingLocation === BrandingLocation.Notification
            || originalTitleElement.id === "movie-title"
            || (originalTitleElement.id === "title" && originalTitleElement.parentElement?.id === "description")) {
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
        if (brandingLocation !== BrandingLocation.UpNextPreview) {
            titleElement.parentElement!.style.display = "flex";
            titleElement.parentElement!.style.alignItems = "flex-start";
            if (onMobile()) titleElement.parentElement!.style.alignItems = "normal";
            titleElement.parentElement!.style.justifyContent = "space-between";

            // For 2024 Oct new UI
            if (titleElement.parentElement!.classList.contains("yt-lockup-metadata-view-model-wiz__title")) {
                titleElement.parentElement!.style.maxHeight = `calc(${getComputedStyle(titleElement.parentElement!).lineHeight} * ${Math.max(1, Config.config!.titleMaxLines)}`;

                const container = titleElement.closest(".yt-lockup-metadata-view-model-wiz__text-container") as HTMLElement;
                if (container) {
                    container.style.width = "100%";
                }
            } else {
                titleElement.parentElement!.style.width = "100%";
            }
        }

        if (brandingLocation === BrandingLocation.Related) {
            // Move badges out of centered div
            const badges = titleElement.parentElement!.querySelectorAll("ytd-badge-supported-renderer");
            for (const badge of badges) {
                let parent = badge.parentElement!.parentElement!;
                if (parent.id === "title-wrapper") parent = parent.parentElement!;

                parent.prepend(badge);
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

    if (brandingLocation === BrandingLocation.UpNextPreview) {
        buttonElement.style.setProperty("display", "none", "important");
    }
    return buttonElement;
}

async function createShowOriginalButton(originalTitleElement: HTMLElement,
        brandingLocation: BrandingLocation, videoID: VideoID): Promise<HTMLElement> {
    const buttonElement = document.createElement("button");
    // Style set here for when css disappears during updates
    buttonElement.style.backgroundColor = "transparent";
    buttonElement.style.border = "none";

    buttonElement.classList.add("cbShowOriginal");
    if (onMobile()) buttonElement.classList.add("cbMobileButton");

    // Playlists and mixes on search page have extra margins that need to be applied to this new element
    const originalMarginTop = getComputedStyle(originalTitleElement).marginTop;
    if (originalMarginTop) {
        buttonElement.style.marginTop = originalMarginTop;
    }

    buttonElement.classList.add("cbButton");
    if (brandingLocation === BrandingLocation.Watch 
            || Config.config!.alwaysShowShowOriginalButton) {
        buttonElement.classList.add("cbDontHide");
    }

    const buttonImage = document.createElement("img");
    buttonImage.style.maxHeight = "20px";

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
        document.querySelector("ytd-video-preview") as HTMLElement
    ];

    const toggleDetails = async () => {
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
    }

    buttonElement.addEventListener("click", (e) => void (async (e) => {
        if (!Config.config!.showOriginalOnHover) {
            e.preventDefault();
            e.stopPropagation();

            await toggleDetails();
        }
    })(e));

    buttonElement.addEventListener("mouseenter", () => void (async () => {
        if (Config.config!.showOriginalOnHover) {
            await toggleDetails();
        }
    })());

    buttonElement.addEventListener("mouseleave", () => void (async () => {
        if (Config.config!.showOriginalOnHover) {
            await toggleDetails();
        }
    })());

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
        const originalStyle = getComputedStyle(originalTitleElement);
        const lineHeight = originalStyle.lineHeight;
        if (lineHeight) {
            buttonElement.style.height = lineHeight;
        }

        if (brandingLocation === BrandingLocation.Endcards) {
            buttonElement.style.margin = originalStyle.margin;
        }

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

function getOriginalTitleText(originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): string {
    switch (brandingLocation) {
        case BrandingLocation.Notification:
            return notificationToTitle(originalTitleElement?.textContent ?? "");
        default:
            return originalTitleElement?.textContent ?? "";
    }
}
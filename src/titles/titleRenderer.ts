import { VideoID } from "@ajayyy/maze-utils/lib/video";
import Config from "../config";
import { getVideoTitleIncludingUnsubmitted } from "../dataFetching";
import { logError } from "../utils/logger";
import { getOrCreateTitleButtonContainer } from "../utils/titleBar";
import { BrandingLocation, toggleShowCustom } from "../videoBranding/videoBranding";
import { formatTitle } from "./titleFormatter";

let lastWatchTitle = "";
let lastWatchVideoID: VideoID | null = null;

export async function replaceTitle(element: HTMLElement, videoID: VideoID, showCustomBranding: boolean, brandingLocation: BrandingLocation, queryByHash: boolean): Promise<boolean> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const titleElement = element.querySelector(".cbCustomTitle") as HTMLElement ?? createTitleElement(originalTitleElement, brandingLocation);

    if (brandingLocation === BrandingLocation.Watch) {
        if (lastWatchVideoID && originalTitleElement?.textContent 
                && videoID !== lastWatchVideoID && originalTitleElement.textContent === lastWatchTitle) {
            // Don't reset it if it hasn't changed videos yet, will be handled by title change listener
            return false;
        }

        lastWatchTitle = originalTitleElement?.textContent ?? "";
        lastWatchVideoID = videoID;
    }

    //todo: add an option to not hide title
    titleElement.style.display = "none";
    originalTitleElement.style.display = "none";

    if (brandingLocation !== BrandingLocation.Watch) {
        const smallBrandingBox = !!titleElement.closest("ytd-grid-video-renderer");

        // To be able to show the show original button in the right place
        titleElement.parentElement!.style.display = "flex";
        titleElement.parentElement!.style.alignItems = "center";
        if (smallBrandingBox) titleElement.parentElement!.style.alignItems = "flex-start";
        titleElement.parentElement!.style.justifyContent = "space-between";
        titleElement.parentElement!.style.width = "100%";

        // For channel pages to make sure the show original button can be on the right
        const metaElement = element.querySelector("#meta") as HTMLElement;
        if (metaElement && !smallBrandingBox) {
            metaElement.style.width = "100%";
        }
    }

    try {
        const titleData = await getVideoTitleIncludingUnsubmitted(videoID, queryByHash)
        const title = titleData?.title;
        if (title) {
            const formattedTitle = formatTitle(title, !titleData.original)
            titleElement.innerText = formattedTitle;
            titleElement.title = formattedTitle;
        } else if (originalTitleElement?.textContent) {
            // innerText is blank when visibility hidden
            const originalText = originalTitleElement.textContent.trim();
            const modifiedTitle = formatTitle(originalText, false);
            if (originalText === modifiedTitle) {
                showOriginalTitle(titleElement, originalTitleElement);
                return false;
            }

            titleElement.innerText = modifiedTitle;
            titleElement.title = modifiedTitle;
        } else {
            originalTitleElement.style.removeProperty("display");
        }

        if (originalTitleElement.parentElement?.title) {
            // Inside element should handle title fine
            originalTitleElement.parentElement.title = "";
        }

        titleElement.style.removeProperty("display");

        if (!showCustomBranding) {
            showOriginalTitle(titleElement, originalTitleElement);
        }
        return true;
    } catch (e) {
        logError(e);
        originalTitleElement.style.removeProperty("display");

        return false;
    }
}

function showOriginalTitle(titleElement: HTMLElement, originalTitleElement: HTMLElement) {
    titleElement.style.display = "none";
    originalTitleElement.style.removeProperty("display");
}

export function getOriginalTitleElement(element: HTMLElement, brandingLocation: BrandingLocation) {
    return element.querySelector(`${getTitleSelector(brandingLocation)}:not(.cbCustomTitle)`) as HTMLElement;
}

function getTitleSelector(brandingLocation: BrandingLocation): string {
    switch (brandingLocation) {
        case BrandingLocation.Watch:
            return "yt-formatted-string";
        case BrandingLocation.Related:
            return "#video-title";
        default:
            throw new Error("Invalid branding location");
    }
}

function createTitleElement(originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): HTMLElement {
    const titleElement = brandingLocation === BrandingLocation.Related ? originalTitleElement.cloneNode() as HTMLElement 
        : document.createElement("div");
    titleElement.classList.add("cbCustomTitle");

    originalTitleElement.parentElement?.appendChild(titleElement);
    return titleElement;
}

export async function hideAndUpdateShowOriginalButton(element: HTMLElement, brandingLocation: BrandingLocation,
        showCustomBranding: boolean): Promise<void> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const buttonElement = await findShowOriginalButton(originalTitleElement, brandingLocation);
    if (buttonElement) {
        const buttonImage = buttonElement.querySelector(".cbShowOriginalImage") as HTMLElement;
        if (buttonImage) {
            if (showCustomBranding) {
                buttonImage.classList.remove("cbOriginalShown");
            } else {
                buttonImage.classList.add("cbOriginalShown");
            }

            if (showCustomBranding === Config.config!.extensionEnabled && brandingLocation !== BrandingLocation.Watch) {
                buttonElement.classList.remove("cbDontHide");
            } else {
                buttonElement.classList.add("cbDontHide");
            }
        }

        buttonElement.style.setProperty("display", "none", "important");
    }
}

export async function findShowOriginalButton(originalTitleElement: HTMLElement, brandingLocation: BrandingLocation): Promise<HTMLElement> {
    const referenceNode = brandingLocation === BrandingLocation.Watch 
        ? (await getOrCreateTitleButtonContainer()) : originalTitleElement.parentElement;
    return referenceNode?.querySelector(".cbShowOriginal") as HTMLElement;
}

export async function findOrCreateShowOriginalButton(element: HTMLElement, brandingLocation: BrandingLocation,
        videoID: VideoID): Promise<HTMLElement> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const buttonElement = await findShowOriginalButton(originalTitleElement, brandingLocation) 
        ?? await createShowOriginalButton(originalTitleElement, brandingLocation);

    buttonElement.setAttribute("videoID", videoID);
    buttonElement.style.removeProperty("display");
    return buttonElement;
}

async function createShowOriginalButton(originalTitleElement: HTMLElement,
        brandingLocation: BrandingLocation): Promise<HTMLElement> {
    const buttonElement = document.createElement("button");
    buttonElement.classList.add("cbShowOriginal");

    buttonElement.classList.add("cbButton");
    if (brandingLocation === BrandingLocation.Watch) buttonElement.classList.add("cbDontHide");

    const buttonImage = document.createElement("img");
    buttonElement.draggable = false;
    buttonImage.className = "cbShowOriginalImage";
    buttonImage.src = chrome.runtime.getURL("icons/logo.svg");
    buttonElement.appendChild(buttonImage);

    if (!Config.config?.extensionEnabled) {
        buttonImage.classList.add("cbOriginalShown");
    }

    buttonElement.addEventListener("click", (e) => void (async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const videoID = buttonElement.getAttribute("videoID");
        if (videoID) {
            await toggleShowCustom(videoID as VideoID);
        }
    })(e));

    if (brandingLocation === BrandingLocation.Watch) {
        const referenceNode = await getOrCreateTitleButtonContainer();
        referenceNode?.prepend(buttonElement);
    } else {
        originalTitleElement.parentElement?.appendChild(buttonElement);
    }

    return buttonElement;
}
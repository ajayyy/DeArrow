import { getVideoID, VideoID } from "@ajayyy/maze-utils/lib/video";
import Config, { TitleFormatting } from "../config";
import { getVideoTitleIncludingUnsubmitted } from "../dataFetching";
import { logError } from "../utils/logger";
import { getOrCreateTitleButtonContainer } from "../utils/titleButton";
import { BrandingLocation, toggleShowCustom, handleShowOriginalButton } from "../videoBranding/videoBranding";

interface WatchTitleMutationObserverInfo {
    observer: MutationObserver;
    element: HTMLElement;
}

let watchTitleMutationObserverInfo: WatchTitleMutationObserverInfo | null = null;
let lastWatchTitle = "";
let lastWatchVideoID: VideoID | null = null;

export async function replaceTitle(element: HTMLElement, videoID: VideoID, showCustomBranding: boolean, brandingLocation: BrandingLocation, queryByHash: boolean): Promise<boolean> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const titleElement = element.querySelector(".cbCustomTitle") as HTMLElement ?? createTitleElement(originalTitleElement, brandingLocation);

    if (brandingLocation === BrandingLocation.Watch) {
        if ((!watchTitleMutationObserverInfo || watchTitleMutationObserverInfo.element !== originalTitleElement)) {
            watchTitleMutationObserverInfo?.observer?.disconnect();
    
            let oldText = originalTitleElement.textContent;
            const observer = new MutationObserver(() => {
                const currentOriginalTitleElement = getOriginalTitleElement(element, brandingLocation);
                if (oldText === currentOriginalTitleElement?.textContent) return;
    
                oldText = currentOriginalTitleElement?.textContent;
                const videoID = getVideoID();
                if (videoID !== null) {
                    void handleShowOriginalButton(element, videoID, brandingLocation,
                        [replaceTitle(element, videoID, showCustomBranding, brandingLocation, queryByHash),
                            Promise.resolve(false)]);
                }
            });
    
            observer.observe(element, {
                characterData: true,
                subtree: true,
                childList: true
            });
    
            watchTitleMutationObserverInfo = {
                observer,
                element: originalTitleElement
            };
        }

        if (lastWatchVideoID && originalTitleElement?.textContent && watchTitleMutationObserverInfo
                && videoID !== lastWatchVideoID && originalTitleElement.textContent === lastWatchTitle) {
            // Don't reset it if it hasn't changed videos yet, will be handled by mutation observer
            return false;
        }

        lastWatchTitle = originalTitleElement?.textContent ?? "";
        lastWatchVideoID = videoID;
    }

    //todo: add an option to not hide title
    titleElement.style.display = "none";
    originalTitleElement.style.display = "none";

    if (brandingLocation !== BrandingLocation.Watch) {
        // To be able to show the show original button in the right place
        titleElement.parentElement!.style.display = "flex";
        titleElement.parentElement!.style.alignItems = "center";
        titleElement.parentElement!.style.justifyContent = "space-between";
        titleElement.parentElement!.style.width = "100%";

        // For channel pages to make sure the show original button can be on the right
        const metaElement = element.querySelector("#meta") as HTMLElement;
        if (metaElement) {
            metaElement.style.width = "100%";
        }
    }

    try {
        const title = (await getVideoTitleIncludingUnsubmitted(videoID, queryByHash))?.title;
        if (title) {
            titleElement.innerText = title;
            titleElement.title = title;
        } else if (originalTitleElement?.textContent) {
            // TODO: Allow customizing this rule
            // innerText is blank when visibility hidden
            const originalText = originalTitleElement.textContent.trim();
            const modifiedTitle = Config.config!.titleFormatting === TitleFormatting.CapitalizeWords ?
                toTitleCase(originalText) : originalText;
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

function getOriginalTitleElement(element: HTMLElement, brandingLocation: BrandingLocation) {
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

export async function hideAndUpdateShowOriginalButton(element: HTMLElement, brandingLocation: BrandingLocation): Promise<void> {
    const originalTitleElement = getOriginalTitleElement(element, brandingLocation);
    const buttonElement = await findShowOriginalButton(originalTitleElement, brandingLocation);
    if (buttonElement) {
        resetShowOriginalButton(buttonElement, brandingLocation);
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
    
    buttonElement.addEventListener("click", (e) => void (async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const videoID = buttonElement.getAttribute("videoID");
        if (videoID) {
            const custom = await toggleShowCustom(videoID as VideoID);
            if (custom) {
                resetShowOriginalButtonFromElements(buttonElement, buttonImage, brandingLocation)
            } else {
                buttonImage.classList.add("cbOriginalShown");
                buttonElement.classList.add("cbDontHide");
            }
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

function resetShowOriginalButton(buttonElement: HTMLElement, brandingLocation: BrandingLocation) {
    const buttonImage = buttonElement.querySelector(".cbShowOriginalImage") as HTMLElement;
    resetShowOriginalButtonFromElements(buttonElement, buttonImage, brandingLocation);
}

function resetShowOriginalButtonFromElements(buttonElement: HTMLElement, buttonImage: HTMLElement,
        brandingLocation: BrandingLocation) {
    buttonImage.classList.remove("cbOriginalShown");
    if (brandingLocation !== BrandingLocation.Watch) buttonElement.classList.remove("cbDontHide");
}

// https://stackoverflow.com/a/196991
function toTitleCase(str: string): string {
    // TODO: ignore some acronyms like AI, allow customizing
    return str.replace(
        /\w\S*/g,
        (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
        }
    );
}
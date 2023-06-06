import { getYouTubeTitleNodeSelector } from "@ajayyy/maze-utils/lib/elements";
import { getOriginalTitleElement } from "../titles/titleRenderer";
import { BrandingLocation } from "../videoBranding/videoBranding";
import { isVisible, waitForElement } from "@ajayyy/maze-utils/lib/dom";

export async function getOrCreateTitleButtonContainer(): Promise<HTMLElement | null> {
    const titleNode = await waitForElement(getYouTubeTitleNodeSelector(), true) as HTMLElement;
    const referenceNode = titleNode?.parentElement;

    if (referenceNode) {
        let titleButtonContainer = document.querySelector(".cbTitleButtonContainer") as HTMLElement;
        if (!titleButtonContainer || !isVisible(titleButtonContainer)) {
            if (titleButtonContainer) titleButtonContainer.remove();

            titleButtonContainer = document.createElement("div");
            titleButtonContainer.classList.add("cbTitleButtonContainer");
            referenceNode.appendChild(titleButtonContainer);

            // Buttons on right
            referenceNode.style.display = "flex";
            referenceNode.style.justifyContent = "space-between";
        }

        return titleButtonContainer;
    }

    return null;
}

let badgeListener: MutationObserver | null = null;
export async function listenForBadges() {
    const titleNode = await waitForElement(getYouTubeTitleNodeSelector(), true) as HTMLElement;
    const referenceNode = titleNode?.parentElement;

    if (referenceNode) {
        badgeListener?.disconnect();
        badgeListener = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement
                                && node.classList.contains("ytd-badge-supported-renderer")) {
                            moveBadge(node);
                        }
                    }
                }
            }
        });

        badgeListener.observe(referenceNode, { childList: true });

        const badges = referenceNode.querySelectorAll("#title > ytd-badge-supported-renderer");
        for (const badge of badges) {
            moveBadge(badge as HTMLElement);
        }
    }
}

function moveBadge(badge: HTMLElement) {
    if (badge.parentElement?.parentElement) {
        // Move badges (unlisted, funding) up one element to fix layout issues
        badge.parentElement!.parentElement!.insertBefore(badge, badge.parentElement!.nextSibling);
    }
}

let titleChangeObserver: MutationObserver | null = null;
const titleChangeListeners: (() => void)[] = [];
export async function listenForTitleChange() {
    const titleNode = await waitForElement(getYouTubeTitleNodeSelector(), true) as HTMLElement;
    titleChangeObserver = setupTextChangeListener(titleChangeObserver, titleNode, true);
}

let miniplayerTitleChangeObserver: MutationObserver | null = null;
export async function listenForMiniPlayerTitleChange() {
    const titleNode = await waitForElement(".miniplayer yt-formatted-string") as HTMLElement;
    miniplayerTitleChangeObserver = setupTextChangeListener(miniplayerTitleChangeObserver, titleNode, false);
}

function setupTextChangeListener(mutationObserver: MutationObserver | null, element: HTMLElement,
        lookForOriginalTitleElement: boolean) {
    if (element) {
        const originalTitleElement = lookForOriginalTitleElement ? 
            getOriginalTitleElement(element, BrandingLocation.Watch)
            : element;
        if (originalTitleElement) {
            mutationObserver?.disconnect();

            let oldText = originalTitleElement.textContent;
            mutationObserver = new MutationObserver(() => {
                if (oldText !== originalTitleElement.textContent) {
                    oldText = originalTitleElement.textContent;
                    for (const listener of titleChangeListeners) {
                        listener();
                    }
                }
            });

            mutationObserver.observe(originalTitleElement, {
                characterData: true,
                subtree: true,
                childList: true
            });
        }
    }

    return mutationObserver;
}
    
export function addTitleChangeListener(listener: () => void) {
    titleChangeListeners.push(listener);
}

export function removeTitleChangeListener(listener: () => void) {
    const index = titleChangeListeners.indexOf(listener);
    if (index !== -1) {
        titleChangeListeners.splice(index, 1);
    }
}
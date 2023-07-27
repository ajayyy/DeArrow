import { waitForElement } from "../maze-utils/dom";
import { logError } from "../utils/logger";
import { BrandingLocation, getLinkElement, replaceVideoCardBranding } from "./videoBranding";

enum CheckType {
    Target,
    AddedNodes
}

let autoplayObserver: MutationObserver | null = null;
let autoplayObserverElement: HTMLElement | null = null;

let endRecommendationsObserver: MutationObserver | null = null;
let endRecommendationsObserverElement: HTMLElement | null = null;

let waiting = false;
let mutationObserver: MutationObserver | null = null;
let observerElement: HTMLElement | null = null;
export async function replaceVideoPlayerSuggestionsBranding(): Promise<void> {
    if (waiting) return;
    waiting = true;

    if (document.URL.includes("/embed")) {
        replaceEmbedSuggestionsBranding().catch(logError);
    }

    const refNode = await waitForElement("#movie_player", true);

    if (!mutationObserver || observerElement !== refNode) {
        if (mutationObserver) mutationObserver.disconnect();

        const endcardSelector = ".ytp-ce-element";
        const autoplaySelector = ".ytp-autonav-endscreen-countdown-overlay";
        const endRecommendationsSelector = ".html5-endscreen";

        // Setup initial listeners
        {
            const initialEndcardElements = refNode.querySelectorAll(endcardSelector);
            if (initialEndcardElements.length > 0) {
                for (const initialEndcardElement of initialEndcardElements) {
                    setupVideoBrandReplacement(initialEndcardElement as HTMLElement, BrandingLocation.Endcards);
                }
            }

            const initialAutoplayElement = refNode.querySelector(autoplaySelector) as HTMLElement;
            if (initialAutoplayElement) {
                setupAutoplayObserver(initialAutoplayElement);
            }

            const initialEndRecommendationsElement = refNode.querySelector(endRecommendationsSelector) as HTMLElement;
            if (initialEndRecommendationsElement) {
                setupRecommendationsObserver(initialEndRecommendationsElement);
            }
        }


        observerElement = refNode as HTMLElement;
        mutationObserver = new MutationObserver((mutations) => {
            // Endcards
            observe(mutations,
                endcardSelector, BrandingLocation.Endcards, CheckType.AddedNodes);

            // Auto play and end recommendations require deeper observers
            // To make it more effecient, they are recreated when needed without
            // using subtree for all of #movie_player
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement) {
                            if (node.matches(autoplaySelector)) {
                                setupAutoplayObserver(node);
                            } else if (node.matches(endRecommendationsSelector)) {
                                setupRecommendationsObserver(node);
                            }
                        }
                    }
                }
            }
        });

        mutationObserver.observe(refNode, {
            childList: true
        });
    }

    waiting = false;
}

async function replaceEmbedSuggestionsBranding(): Promise<void> {
    const refNode = await waitForElement(".ytp-pause-overlay");

    if (!mutationObserver || observerElement !== refNode) {
        if (mutationObserver) mutationObserver.disconnect();

        const suggestionSelector = ".ytp-suggestion-link";
        const initialSuggestionElements = refNode.querySelectorAll(suggestionSelector);
        if (initialSuggestionElements.length > 0) {
            for (const initialSuggestionElement of initialSuggestionElements) {
                setupVideoBrandReplacement(initialSuggestionElement as HTMLElement, BrandingLocation.EmbedSuggestions);
            }
        }
    }
}

export function setupAutoplayObserver(element: HTMLElement): void {
    const refNode = element.querySelector(".ytp-autonav-endscreen-video-info") as HTMLElement;
    if (!autoplayObserver || autoplayObserverElement !== element && refNode) {
        if (autoplayObserver) autoplayObserver.disconnect();

        autoplayObserverElement = element as HTMLElement;
        autoplayObserver = new MutationObserver((mutations) => observe(mutations,
            ".ytp-autonav-endscreen-upnext-title:not(.cbCustomTitle)", BrandingLocation.Autoplay,
            CheckType.Target, ".ytp-autonav-endscreen-countdown-overlay"));

        // Sometimes it is one level deep due to the div added to make the show original button work
        autoplayObserver.observe(refNode, {
            childList: true,
            subtree: true 
        });
    }
}

export function setupRecommendationsObserver(element: HTMLElement): void {
    const refNode = element.querySelector(".ytp-endscreen-content") as HTMLElement;

    if (!endRecommendationsObserver || endRecommendationsObserverElement !== element && refNode) {
        if (endRecommendationsObserver) endRecommendationsObserver.disconnect();

        endRecommendationsObserverElement = element as HTMLElement;
        endRecommendationsObserver = new MutationObserver((mutations) => observe(mutations,
            ".ytp-videowall-still", BrandingLocation.EndRecommendations, CheckType.AddedNodes));

        endRecommendationsObserver.observe(refNode, {
            childList: true
        });
    }
}

function observe(mutations: MutationRecord[], selector: string, brandingLocation: BrandingLocation, 
        checkType: CheckType, nodeSelectorToUse?: string): void {

    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            if (checkType === CheckType.Target) {
                const target = mutation.target as HTMLElement;
                if (target?.matches(selector)) {
                    setupVideoBrandReplacement(nodeSelectorToUse 
                        ? target.closest(nodeSelectorToUse) as HTMLElement : target, brandingLocation);
                }
            } else if (checkType === CheckType.AddedNodes) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        if (node.matches(selector)) {
                            setupVideoBrandReplacement(nodeSelectorToUse 
                                ? node.closest(nodeSelectorToUse) as HTMLElement : node, brandingLocation);
                        }
                    }
                }
            }
        }
    }
}

const handledElements = new Set<HTMLElement>();
function setupVideoBrandReplacement(element: HTMLElement, brandingLocation: BrandingLocation): void {
    replaceVideoCardBranding(element, brandingLocation).catch(logError);

    if (brandingLocation === BrandingLocation.EndRecommendations
            || brandingLocation === BrandingLocation.EmbedSuggestions) {
        if (element && !handledElements.has(element)) {
            handledElements.add(element);
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "attributes" && mutation.attributeName === "href") {
                        replaceVideoCardBranding(element, brandingLocation).catch(logError);
                        break;
                    }
                }
            });

            const link = getLinkElement(element, brandingLocation);
            if (link) {
                observer.observe(link, {
                    attributes: true
                });
            }
        }
    }
}


let mobileControlsObserver: MutationObserver | null = null;
export async function setupMobileAutoplayHandler() {
    const rootControlContainer = await waitForElement("#player-control-container ytm-custom-control");

    if (mobileControlsObserver) mobileControlsObserver.disconnect();

    mobileControlsObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        if (node.id === "player-control-overlay") {
                            watchForMobileAutoplay();
                        }
                    }
                }
            }
        }
    });

    mobileControlsObserver.observe(rootControlContainer, {
        childList: true
    });
}

let mobileAutoplayObserver: MutationObserver | null = null;
function watchForMobileAutoplay() {
    const controls = document.querySelector(".player-controls-content");

    if (controls) {
        if (mobileAutoplayObserver) mobileAutoplayObserver.disconnect();

        mobileAutoplayObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement) {
                            if (node.classList.contains("ytm-player-endscreen")) {
                                const autoplayElement = node.querySelector(".autonav-endscreen-countdown-container") as HTMLElement;

                                if (autoplayElement) {
                                    replaceVideoCardBranding(autoplayElement, BrandingLocation.Related).catch(logError);
                                }
                            }
                        }
                    }
                }
            }
        });

        mobileAutoplayObserver.observe(controls, {
            childList: true
        });
    }
}
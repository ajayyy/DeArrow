import { addCleanupListener } from "../../maze-utils/src/cleanup";
import { waitForElement } from "../../maze-utils/src/dom";
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

// Other endrecommendations format
let endscreenAutonavObserver: MutationObserver | null = null;
let endscreenAutonavObserverElement: HTMLElement | null = null;
let endscreenAutonavSuggestionObserver: MutationObserver | null = null;
let endscreenAutonavSuggestionObserverElement: HTMLElement | null = null;
let modernEndRecommendations = false;
const endRecommendationsCardSelector = ".ytp-videowall-still, .ytp-modern-videowall-still";

let waiting = false;
let mutationObserver: MutationObserver | null = null;
let observerElement: HTMLElement | null = null;
export async function replaceVideoPlayerSuggestionsBranding(): Promise<void> {
    if (waiting) return;
    waiting = true;

    if (document.URL.includes("/embed")) {
        replaceEmbedSuggestionsBranding().catch(logError);
    }

    replaceUpNextButtonBranding().catch(logError);
    
    const refNode = await waitForElement("#movie_player", true);

    if (!mutationObserver || observerElement !== refNode) {
        if (mutationObserver) mutationObserver.disconnect();

        const endcardSelector = ".ytp-ce-element";
        const autoplaySelector = ".ytp-autonav-endscreen-countdown-overlay";
        const endRecommendationsSelectorModern = ".ytp-fullscreen-grid";
        const endRecommendationsSelectorOld = ".html5-endscreen:not(.autonav-endscreen)";
        const autonavSelector = ".html5-endscreen.autonav-endscreen";

        modernEndRecommendations = !!refNode.querySelector(endRecommendationsSelectorModern);

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

            const initialEndRecommendationsElement = (modernEndRecommendations
                ? refNode.querySelector(endRecommendationsSelectorModern)
                : refNode.querySelector(endRecommendationsSelectorOld)) as HTMLElement;
            if (initialEndRecommendationsElement) {
                setupRecommendationsObserver(initialEndRecommendationsElement);

                if (modernEndRecommendations) {
                    const elements = initialEndRecommendationsElement.querySelectorAll(endRecommendationsCardSelector);
                    for (const element of elements) {
                        setupVideoBrandReplacement(element as HTMLElement, BrandingLocation.EndRecommendations);
                    }
                }
            }

            const initialAutonavElement = refNode.querySelector(autonavSelector) as HTMLElement;
            if (initialAutonavElement) {
                setupAutonavObserver(initialAutonavElement);
                setupAutonavSuggestionsObserver(initialAutonavElement);
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
                            } else if ((modernEndRecommendations && node.matches(endRecommendationsSelectorModern))
                                    || (!modernEndRecommendations && node.matches(endRecommendationsSelectorOld))) {
                                setupRecommendationsObserver(node);
                            }  else if (node.matches(autonavSelector)) {
                                setupAutonavSuggestionsObserver(node);
                                setupAutonavObserver(node);
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

    const suggestionSelector = ".ytp-suggestion-link";
    const initialSuggestionElements = refNode.querySelectorAll(suggestionSelector);
    if (initialSuggestionElements.length > 0) {
        for (const initialSuggestionElement of initialSuggestionElements) {
            setupVideoBrandReplacement(initialSuggestionElement as HTMLElement, BrandingLocation.EmbedSuggestions);
        }
    }
}

/**
 * Appears when hovering next button next to play button in player
 */
let upNextMutationObserver: MutationObserver | null = null;
let observingElement: HTMLElement | null = null;
async function replaceUpNextButtonBranding(element?: HTMLElement): Promise<void> {
    const refNode = element ?? (await waitForElement(".ytp-tooltip-text-wrapper")).parentElement;
    if (!refNode) return;

    if (observingElement === refNode) return;
    observingElement = refNode as HTMLElement;
    
    if (upNextMutationObserver) {
        upNextMutationObserver.disconnect();
    }

    let tooltipModified = false;
    const handleTooltipRemoved = () => {
        if (tooltipModified) {
            tooltipModified = false;
            const elementsToDelete = refNode.querySelectorAll(".cbCustomTitle, .cbShowOriginal, .cbCustomThumbnailCanvas");
            for (const element of elementsToDelete) {
                element.remove();
            }

            const elementsToUnhide = refNode.querySelectorAll(".ytp-tooltip-text-no-title, .ytp-tooltip-bg") as NodeListOf<HTMLElement>;
            for (const element of elementsToUnhide) {
                element.style.removeProperty("display");
            }
        }
    }

    upNextMutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName === "class") {
                if (refNode.classList.contains("ytp-text-detail")) {
                    tooltipModified = true;

                    // The tooltip has become an up next preview (normally it is the hover preview for scrubbing the video)
                    replaceVideoCardBranding(refNode as HTMLElement, BrandingLocation.UpNextPreview).catch(logError);
                } else {
                    handleTooltipRemoved();
                }

                break;
            } else if (mutation.attributeName === "style" && refNode.style.display === "none") {
                handleTooltipRemoved();
                break;
            }
        }
    });

    upNextMutationObserver.observe(refNode, {
        attributes: true
    });
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
    const refNode = element.querySelector(".ytp-endscreen-content, .ytp-fullscreen-grid-stills-container") as HTMLElement;

    if (!endRecommendationsObserver || endRecommendationsObserverElement !== element && refNode) {
        if (endRecommendationsObserver) endRecommendationsObserver.disconnect();

        endRecommendationsObserverElement = element as HTMLElement;
        endRecommendationsObserver = new MutationObserver((mutations) => observe(mutations,
            endRecommendationsCardSelector, BrandingLocation.EndRecommendations, CheckType.AddedNodes));

        endRecommendationsObserver.observe(refNode, {
            childList: true
        });
    }
}

export function setupAutonavObserver(element: HTMLElement): void {
    const refNode = element.querySelector(".ytp-autonav-endscreen-upnext-container") as HTMLElement;
    if (!endscreenAutonavObserver || endscreenAutonavObserverElement !== element && refNode) {
        if (endscreenAutonavObserver) endscreenAutonavObserver.disconnect();

        endscreenAutonavObserverElement = element as HTMLElement;
        endscreenAutonavObserver = new MutationObserver((mutations) => observe(mutations,
            ".ytp-autonav-endscreen-upnext-title:not(.cbCustomTitle)", BrandingLocation.EndAutonav,
            CheckType.Target, ".ytp-autonav-endscreen-link-container"));

        // Sometimes it is one level deep due to the div added to make the show original button work
        endscreenAutonavObserver.observe(refNode, {
            childList: true,
            subtree: true 
        });
    }
}

export function setupAutonavSuggestionsObserver(element: HTMLElement): void {
    const refNode = element.querySelector(".ytp-suggestions-container") as HTMLElement;

    if (!endscreenAutonavSuggestionObserver || endscreenAutonavSuggestionObserverElement !== element && refNode) {
        if (endscreenAutonavSuggestionObserver) endscreenAutonavSuggestionObserver.disconnect();

        endscreenAutonavSuggestionObserverElement = element as HTMLElement;
        endscreenAutonavSuggestionObserver = new MutationObserver((mutations) => observe(mutations,
            ".ytp-autonav-suggestion-card", BrandingLocation.EndAutonav, CheckType.AddedNodes));

        endscreenAutonavSuggestionObserver.observe(refNode, {
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
            || brandingLocation === BrandingLocation.EmbedSuggestions
            || brandingLocation === BrandingLocation.EndAutonav) {
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

export function setupWatchPageBrandingCleanup() {
    addCleanupListener(() => {
        autoplayObserver?.disconnect?.();
        endRecommendationsObserver?.disconnect?.();
        mobileControlsObserver?.disconnect?.();
        mobileAutoplayObserver?.disconnect?.();
        mutationObserver?.disconnect?.();
        endscreenAutonavObserver?.disconnect?.();
        endscreenAutonavSuggestionObserver?.disconnect?.();
    });
}
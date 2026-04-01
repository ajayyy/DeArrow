import * as React from "react";
import { waitFor } from "../maze-utils/src";
import { Root, createRoot } from "react-dom/client";
import Config, { ThumbnailCacheOption } from "./config/config";
import { NebulaTitleEditorComponent } from "./nebula/NebulaTitleEditorComponent";
import { ThumbnailResult, ThumbnailSubmission } from "./thumbnails/thumbnailData";
import { logError } from "./utils/logger";
import { fetchBranding, submitVideoBranding, clearCache, sendRequestToNebulaThumbnailCache } from "./dataFetching";
import { VideoID } from "../maze-utils/src/video";
import { formatTitleDefaultSettings } from "./titles/titleFormatter";
import { formatJSErrorMessage, getLongErrorMessage } from "../maze-utils/src/formating";
import { shouldStoreVotes } from "./utils/configUtils";
import { BrandingResult } from "./videoBranding/videoBranding";
import { TitleResult } from "./titles/titleData";
import { FetchResponse } from "../maze-utils/src/background-request-proxy";

declare global {
    interface Window {
        dearrowNebulaInitialized?: boolean;
        __QUERY_DATA__?: unknown;
    }
}

interface ActiveNebulaEditor {
    videoSlug: string;
    root: Root;
    container: HTMLDivElement;
    inPageHost: HTMLDivElement | null;
    theaterModeObserver: MutationObserver | null;
    onOutsidePointerDown: ((event: MouseEvent) => void) | null;
    onKeyDown: (event: KeyboardEvent) => void;
    onWindowLayoutChange: (() => void) | null;
    cancelPendingModeSwitch: (() => void) | null;
}

const nebulaHostPattern = /(^|\.)nebula\.tv$/u;
const videoAnchorSelector = "a[href*='/videos/']";
const titleSelector = "h3[data-thumbnail-title='true']";
const watchPageTitleSelector = "section[aria-label='video details'] h1, h1.css-1mt5m4d";
const editButtonTitle = "Open DeArrow title editor";

const showOriginalButtonIcon = `<img class="cbShowOriginalImage" src="${chrome.runtime.getURL("icons/logo.svg")}" style="max-height: 20px;">`;

const editButtonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M14.1 7.1l2.9 2.9L6.1 20.7l-3.6.7.7-3.6L14.1 7.1zm0-2.8L1.4 16.9 0 24l7.1-1.4L19.8 9.9l-5.7-5.7zm7.1 4.3L24 5.7 18.3 0l-2.8 2.8 5.7 5.7z"/>
</svg>`;

const activeAnchorProcesses = new WeakSet<HTMLAnchorElement>();
const runtimeThumbnailPreviewBySlug = new Map<string, string>();
const serverThumbnailBlobBySlug = new Map<string, string>();
const activeNebulaThumbnailRequests = new Set<string>();
const showOriginalOverrides = new Set<string>();

const SERVER_TITLE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ServerBrandingCache {
    branding: BrandingResult | null;
    fetchedAt: number;
}

const serverBrandingBySlug = new Map<string, ServerBrandingCache>();

function getServerBranding(videoSlug: string): BrandingResult | null {
    const entry = serverBrandingBySlug.get(videoSlug);
    if (!entry) return null;
    return entry.branding;
}

function getServerTitle(videoSlug: string): string | null {
    const branding = getServerBranding(videoSlug);
    if (!branding) return null;
    const topTitle = branding.titles?.[0];
    if (topTitle && !topTitle.original && topTitle.title) {
        return topTitle.title;
    }
    return null;
}

function isServerBrandingStale(videoSlug: string): boolean {
    const entry = serverBrandingBySlug.get(videoSlug);
    if (!entry) return true;
    return Date.now() - entry.fetchedAt > SERVER_TITLE_TTL_MS;
}

let processScheduled = false;
let activeEditor: ActiveNebulaEditor | null = null;

if (!window.dearrowNebulaInitialized && nebulaHostPattern.test(location.hostname)) {
    window.dearrowNebulaInitialized = true;
    setupNebulaTitleReplacement().catch(logError);
}

async function setupNebulaTitleReplacement() {
    await waitFor(() => Config.isReady());

    scheduleProcessing();

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes") {
                scheduleProcessing();
                return;
            }

            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                scheduleProcessing();
                return;
            }
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["href", "title"]
    });

    chrome.storage.onChanged.addListener(() => {
        scheduleProcessing();
    });
}

function scheduleProcessing() {
    if (processScheduled) return;
    processScheduled = true;

    requestAnimationFrame(() => {
        processScheduled = false;
        Promise.all([
            processAllVideoAnchors(),
            processWatchPageTitle()
        ]).catch(logError);
    });
}

async function processAllVideoAnchors() {
    const anchors = document.querySelectorAll(videoAnchorSelector) as NodeListOf<HTMLAnchorElement>;
    for (const anchor of anchors) {
        if (activeAnchorProcesses.has(anchor)) continue;

        activeAnchorProcesses.add(anchor);
        void processVideoAnchor(anchor)
            .catch(logError)
            .finally(() => activeAnchorProcesses.delete(anchor));
    }
}

async function processVideoAnchor(anchor: HTMLAnchorElement) {
    const videoSlug = getVideoSlugFromAnchor(anchor);

    let titleElement = anchor.querySelector(titleSelector) as HTMLElement | null;
    
    if (!titleElement) {
        const directSpans = Array.from(anchor.children)
            .filter((child) => child.tagName === "SPAN") as HTMLElement[];

        if (directSpans.length >= 2) {
            const maybeTitleSpan = directSpans[directSpans.length - 1];
            const text = (maybeTitleSpan.textContent ?? "").trim();
            if (text) {
                titleElement = maybeTitleSpan;
            }
        }
    }

    if (titleElement) {
        if (!videoSlug) {
            restoreOriginalTitle(titleElement);
        } else {
            await processTitleElement(titleElement, videoSlug);
            fetchNebulaServerBranding(videoSlug).catch(logError);
        }
    }

    if (videoSlug) {
        processAnchorThumbnail(anchor, videoSlug);
    }
}

async function processWatchPageTitle() {
    const videoSlug = getCurrentVideoSlugFromLocation();
    if (!videoSlug) {
        return;
    }

    const watchTitleElement = document.querySelector(watchPageTitleSelector) as HTMLElement | null;
    if (!watchTitleElement) {
        return;
    }

    await processTitleElement(watchTitleElement, videoSlug);
    setupWatchPageTitleButtons(watchTitleElement, videoSlug);
    processWatchPageThumbnail(videoSlug);
    fetchNebulaServerBranding(videoSlug).catch(logError);
}

async function processTitleElement(titleElement: HTMLElement, videoSlug: string) {

    if (titleElement.dataset.cbNebulaSlug !== videoSlug) {
        restoreOriginalTitle(titleElement);
        titleElement.dataset.cbNebulaSlug = videoSlug;
        titleElement.dataset.cbNebulaOriginalTitle = (titleElement.textContent ?? "").trim();
    }

    if (!shouldReplaceTitles()) {
        restoreOriginalTitle(titleElement);
        return;
    }

    const customTitle = getCustomTitle(videoSlug);

    if (!customTitle) {
        restoreOriginalTitle(titleElement);
        return;
    }

    if (showOriginalOverrides.has(videoSlug)) {
        return;
    }

    const formattedTitle = await formatTitleDefaultSettings(customTitle, true);

    if ((titleElement.textContent ?? "").trim() !== formattedTitle) {
        titleElement.textContent = formattedTitle;
    }

    titleElement.classList.add("cbCustomTitle", "cbNebulaCustomTitle");
}

function shouldReplaceTitles() {
    return !!Config.config?.extensionEnabled
        && !!Config.config?.replaceTitles
        && !!Config.config?.useCrowdsourcedTitles;
}

function shouldReplaceThumbnails() {
    return !!Config.config?.extensionEnabled
        && !!Config.config?.replaceThumbnails;
}

function restoreOriginalTitle(titleElement: HTMLElement) {
    if (!titleElement.classList.contains("cbNebulaCustomTitle")) {
        return;
    }

    const originalTitle = titleElement.dataset.cbNebulaOriginalTitle;
    if (originalTitle != null) {
        titleElement.textContent = originalTitle;
    }

    titleElement.classList.remove("cbNebulaCustomTitle", "cbCustomTitle");
}

function getVideoSlugFromAnchor(anchor: HTMLAnchorElement): string | null {
    try {
        const url = new URL(anchor.href, document.URL);

        if (!nebulaHostPattern.test(url.hostname)) {
            return null;
        }

        return getVideoSlugFromPath(url.pathname);
    } catch {
        return null;
    }
}

function getCurrentVideoSlugFromLocation(): string | null {
    if (!nebulaHostPattern.test(location.hostname)) {
        return null;
    }

    return getVideoSlugFromPath(location.pathname);
}

function getVideoSlugFromPath(pathname: string): string | null {
    const match = pathname.match(/^\/videos\/([^/?#]+)/u);
    return match?.[1] ?? null;
}

function getCustomTitle(videoSlug: string): string | null {
    // Local unsubmitted title takes priority over server
    const selectedLocalTitle = Config.local?.unsubmitted?.[videoSlug]?.titles?.find((title) => title.selected)?.title;
    if (selectedLocalTitle) {
        const cleanTitle = selectedLocalTitle.trim();
        if (cleanTitle.length > 0) return cleanTitle;
    }

    // Fall back to server-fetched title
    const serverTitle = getServerTitle(videoSlug);
    return serverTitle ?? null;
}

async function fetchNebulaServerBranding(videoSlug: string): Promise<void> {
    if (serverBrandingBySlug.has(videoSlug) && !isServerBrandingStale(videoSlug)) {
        return; // Already fetched and still fresh
    }

    // Mark as fetched immediately to prevent duplicate requests on rapid re-renders
    serverBrandingBySlug.set(videoSlug, { branding: null, fetchedAt: Date.now() });

    const results = await fetchBranding(false, videoSlug as VideoID, "Nebula");
    const branding = results?.[videoSlug as VideoID] ?? null;

    if (branding) {
        serverBrandingBySlug.set(videoSlug, { branding, fetchedAt: Date.now() });

        // Fetch the thumbnail image from the cache server if available
        const topThumbnail = branding.thumbnails?.[0];
        if (topThumbnail && !topThumbnail.original && Number.isFinite(topThumbnail.timestamp)) {
            const title = branding.titles?.[0]?.title;
            fetchNebulaThumbnailFromCache(videoSlug, topThumbnail.timestamp, title).catch(logError);
        }

        scheduleProcessing(); // Re-run to apply the newly fetched title
    }
}

async function fetchNebulaThumbnailFromCache(videoSlug: string, timestamp: number, title?: string): Promise<void> {
    if (Config.config!.thumbnailCacheUse === ThumbnailCacheOption.Disable) {
        return;
    }

    if (activeNebulaThumbnailRequests.has(videoSlug) || serverThumbnailBlobBySlug.has(videoSlug)) {
        return;
    }

    activeNebulaThumbnailRequests.add(videoSlug);

    try {
        const isWatchPage = getCurrentVideoSlugFromLocation() === videoSlug;
        const request = await sendRequestToNebulaThumbnailCache(
            videoSlug, timestamp, title, true, isWatchPage
        );

        if (request.status === 200 && request.responseBinary) {
            const blob = (request.responseBinary instanceof Blob)
                ? request.responseBinary
                : new Blob([new Uint8Array(request.responseBinary).buffer]);
            const blobUrl = URL.createObjectURL(blob);

            // Revoke the old blob URL to avoid memory leaks
            const oldBlobUrl = serverThumbnailBlobBySlug.get(videoSlug);
            if (oldBlobUrl) {
                URL.revokeObjectURL(oldBlobUrl);
            }

            serverThumbnailBlobBySlug.set(videoSlug, blobUrl);
            scheduleProcessing();
        }
    } catch (e) {
        logError(`Failed to fetch Nebula thumbnail for ${videoSlug}:`, e);
    } finally {
        activeNebulaThumbnailRequests.delete(videoSlug);
    }
}

function setupWatchPageTitleButtons(titleElement: HTMLElement, videoSlug: string) {
    const titleContainer = getWatchPageTitleContainer(titleElement);
    if (!titleContainer) {
        return;
    }

    titleContainer.style.position = "relative";
    titleElement.style.paddingRight = "84px";

    const titleColor = getComputedStyle(titleElement).color;
    titleContainer.style.setProperty("--yt-spec-text-primary", titleColor);

    const buttonContainer = getOrCreateWatchPageButtonContainer(titleContainer);
    buttonContainer.style.position = "absolute";
    buttonContainer.style.top = "0";
    buttonContainer.style.right = "0";
    buttonContainer.style.display = "flex";
    buttonContainer.style.alignItems = "center";
    buttonContainer.style.zIndex = "2";

    const isShowingCustom = titleElement.classList.contains("cbNebulaCustomTitle");
    const showOriginalTitle = isShowingCustom ? "Show Original" : "Show Modified";
    const showOriginalButton = getOrCreateWatchPageButton(buttonContainer, "cbNebulaShowOriginalButton", showOriginalTitle, showOriginalButtonIcon);
    showOriginalButton.classList.add("cbShowOriginal", "cbDontHide");
    showOriginalButton.style.color = titleColor;

    const showOriginalImage = showOriginalButton.querySelector(".cbShowOriginalImage") as HTMLElement;
    if (showOriginalImage) {
        if (!isShowingCustom) {
            showOriginalImage.classList.add("cbOriginalShown");
        } else {
            showOriginalImage.classList.remove("cbOriginalShown");
        }
    }

    const hasCustomTitle = !!getCustomTitle(videoSlug);
    showOriginalButton.disabled = !hasCustomTitle;
    showOriginalButton.style.opacity = hasCustomTitle ? "1" : "0.45";
    showOriginalButton.style.cursor = hasCustomTitle ? "pointer" : "default";

    showOriginalButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!getCustomTitle(videoSlug)) return;

        const img = showOriginalButton.querySelector(".cbShowOriginalImage") as HTMLElement | null;

        if (titleElement.classList.contains("cbNebulaCustomTitle")) {
            showOriginalOverrides.add(videoSlug);
            restoreOriginalTitle(titleElement);
            showOriginalButton.title = "Show Modified";
            if (img) img.classList.add("cbOriginalShown");
        } else {
            showOriginalOverrides.delete(videoSlug);
            const customTitle = getCustomTitle(videoSlug);
            if (customTitle) {
                formatTitleDefaultSettings(customTitle, true).then((formattedTitle) => {
                    titleElement.textContent = formattedTitle;
                    titleElement.classList.add("cbCustomTitle", "cbNebulaCustomTitle");
                }).catch(() => {
                    titleElement.textContent = customTitle;
                    titleElement.classList.add("cbCustomTitle", "cbNebulaCustomTitle");
                });
            }
            showOriginalButton.title = "Show Original";
            if (img) img.classList.remove("cbOriginalShown");
        }
    };

    const editButton = getOrCreateWatchPageButton(buttonContainer, "cbNebulaEditTitleButton", editButtonTitle, editButtonIcon);
    editButton.style.color = titleColor;
    editButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openYouTubeStyleTitleEditor(titleElement, videoSlug);
    };
}

function getWatchPageTitleContainer(titleElement: HTMLElement): HTMLElement | null {
    return titleElement.parentElement;
}

function getOrCreateWatchPageButtonContainer(titleContainer: HTMLElement): HTMLElement {
    let buttonContainer = titleContainer.querySelector(".cbNebulaTitleButtonContainer") as HTMLElement | null;
    if (buttonContainer) {
        return buttonContainer;
    }

    buttonContainer = document.createElement("div");
    buttonContainer.className = "cbTitleButtonContainer cbNebulaTitleButtonContainer";
    buttonContainer.style.pointerEvents = "auto";
    titleContainer.appendChild(buttonContainer);

    return buttonContainer;
}

function getOrCreateWatchPageButton(buttonContainer: HTMLElement, className: string, title: string, icon: string): HTMLButtonElement {
    let button = buttonContainer.querySelector(`.${className}`) as HTMLButtonElement | null;
    if (button) {
        button.title = title;
        return button;
    }

    button = document.createElement("button");
    button.className = `cbButton cbTitleButton ${className}`;
    button.title = title;
    button.type = "button";
    button.innerHTML = icon;
    button.draggable = false;
    button.style.marginLeft = "6px";
    button.style.marginRight = "0";
    button.style.height = "28px";
    button.style.width = "28px";
    button.style.opacity = "0.95";
    button.style.overflow = "visible";
    button.style.cursor = "pointer";
    buttonContainer.appendChild(button);

    return button;
}

function openYouTubeStyleTitleEditor(titleElement: HTMLElement, videoSlug: string) {
    if (!document.body) {
        return;
    }

    if (activeEditor?.videoSlug === videoSlug) {
        closeActiveEditor();
        return;
    }

    closeActiveEditor();

    const originalTitle = (titleElement.dataset.cbNebulaOriginalTitle ?? titleElement.textContent ?? "").trim();
    const initialCustomTitle = getCustomTitle(videoSlug);
    const initialCustomThumbnail = getLocalCustomThumbnail(videoSlug);
    const initialCustomThumbnailPreviewUrl = runtimeThumbnailPreviewBySlug.get(videoSlug) ?? null;
    const originalThumbnailUrl = getNebulaOriginalThumbnailUrl(videoSlug, titleElement);
    const videoElement = getCurrentVideoSlugFromLocation() === videoSlug ? getCurrentVideoElement() : null;
    const shouldUseInPageMode = shouldUseNebulaInPageEditor(titleElement);
    const isWatchPageEditor = !!titleElement.closest("section[aria-label='video details']");
    const inPageHost = shouldUseInPageMode ? getNebulaInPageEditorHost(titleElement) : null;
    const useInPageMode = !!inPageHost;
    const nebulaTextColor = getComputedStyle(titleElement).color || "inherit";

    const container = document.createElement("div");
    container.id = "cbSubmitMenu";
    container.classList.add("cbNebulaSubmitMenu");
    container.style.backgroundColor = "transparent";
    container.style.setProperty("backdrop-filter", "none");
    container.style.borderRadius = "0";
    container.style.border = "none";
    container.style.boxShadow = "none";
    container.style.fontSize = "12px";
    container.style.lineHeight = "normal";
    container.style.setProperty("--cb-nebula-text", nebulaTextColor);
    container.style.setProperty("--yt-spec-text-primary", "var(--cb-nebula-text)");
    container.style.color = "var(--yt-spec-text-primary)";
    container.style.fill = "var(--yt-spec-text-primary)";
    container.style.overflowX = "hidden";
    applyNebulaDescriptionSurfaceStyle(container);

    if (useInPageMode && inPageHost) {
        container.style.position = "relative";
        container.style.width = "100%";
        container.style.maxWidth = "100%";
        container.style.marginLeft = "auto";
        container.style.marginRight = "0";
        container.style.marginTop = "0";
        container.style.zIndex = "1";
        inPageHost.appendChild(container);
    } else {
        container.style.position = "absolute";
        container.style.width = `${Math.min(360, Math.max(280, window.innerWidth - 24))}px`;
        container.style.maxWidth = "calc(100vw - 24px)";
        container.style.zIndex = "10000";

        applyNebulaEditorLayout(container, titleElement);
        document.body.appendChild(container);
    }

    // Get server branding data for the editor
    const serverBranding = getServerBranding(videoSlug);
    const serverTitles: TitleResult[] = serverBranding?.titles ?? [];
    const serverThumbnails: ThumbnailResult[] = serverBranding?.thumbnails ?? [];

    // Build a map of blob URLs for server thumbnails already fetched from the cache
    const thumbnailBlobUrls: Record<string, string> = {};
    const topBlobUrl = serverThumbnailBlobBySlug.get(videoSlug);
    if (topBlobUrl && serverThumbnails.length > 0) {
        const top = serverThumbnails[0];
        const key = top.original ? "original" : String(top.timestamp);
        thumbnailBlobUrls[key] = topBlobUrl;
    }

    // Calculate initial upvoted indices from unsubmitted data
    const unsubmittedData = Config.local?.unsubmitted?.[videoSlug];
    const upvotedUnsubmittedTitle = unsubmittedData?.titles?.find((t) => t.selected);
    let initialUpvotedTitleIndex = -1;
    if (upvotedUnsubmittedTitle) {
        // Index 0 = original, 1 = blank custom, 2+ = server titles
        if (upvotedUnsubmittedTitle.title === originalTitle) {
            initialUpvotedTitleIndex = 0;
        } else {
            const serverIdx = serverTitles
                .filter((s) => s.title !== originalTitle)
                .findIndex((s) => s.title === upvotedUnsubmittedTitle.title);
            if (serverIdx !== -1) {
                initialUpvotedTitleIndex = serverIdx + 2;
            }
        }
    }

    const root = createRoot(container);
    root.render(React.createElement(NebulaTitleEditorComponent, {
        videoSlug,
        originalTitle,
        initialCustomTitle,
        initialCustomThumbnail,
        initialCustomThumbnailPreviewUrl,
        originalThumbnailUrl,
        videoElement,
        serverTitles,
        serverThumbnails,
        thumbnailBlobUrls,
        initialUpvotedTitleIndex,
        onCustomTitleChange: (newTitle: string | null) => {
            if (shouldStoreVotes()) {
                if (newTitle) {
                    saveLocalCustomTitle(videoSlug, newTitle);
                } else {
                    clearLocalCustomTitle(videoSlug);
                }
            } else {
                // Clear any existing unsubmitted data when not storing
                clearLocalCustomTitle(videoSlug);
            }

            // Submit to server (only for custom titles, not original selections)
            if (newTitle) {
                const titleSubmission = { title: newTitle, original: false };
                submitVideoBranding(videoSlug as VideoID, titleSubmission, null, false, false, "Nebula")
                    .then((result) => {
                        if (result && result.ok) {
                            serverBrandingBySlug.delete(videoSlug);
                            clearCache(videoSlug as VideoID);

                            // Re-fetch from server after delay to get server-verified branding
                            setTimeout(() => {
                                serverBrandingBySlug.delete(videoSlug);
                                fetchNebulaServerBranding(videoSlug).catch(logError);
                            }, 1100);
                        } else {
                            alert(getLongErrorMessage(result.status, result.responseText));
                        }
                    })
                    .catch((e) => {
                        logError(e);
                        alert(formatJSErrorMessage(e));
                    });
            }

            scheduleProcessing();
        },
        onCustomThumbnailChange: (thumbnail: ThumbnailSubmission | null, previewDataUrl?: string | null) => {
            if (shouldStoreVotes()) {
                if (thumbnail && !thumbnail.original) {
                    saveLocalCustomThumbnail(videoSlug, thumbnail);
                    if (previewDataUrl) {
                        runtimeThumbnailPreviewBySlug.set(videoSlug, previewDataUrl);
                    }
                } else {
                    clearLocalCustomThumbnail(videoSlug);
                    runtimeThumbnailPreviewBySlug.delete(videoSlug);
                }
            } else {
                clearLocalCustomThumbnail(videoSlug);
                runtimeThumbnailPreviewBySlug.delete(videoSlug);
            }

            // Submit thumbnail to server
            if (thumbnail) {
                submitVideoBranding(videoSlug as VideoID, null, thumbnail, false, false, "Nebula")
                    .then((result) => {
                        if (result && result.ok) {
                            serverBrandingBySlug.delete(videoSlug);
                            clearCache(videoSlug as VideoID);

                            setTimeout(() => {
                                serverBrandingBySlug.delete(videoSlug);
                                fetchNebulaServerBranding(videoSlug).catch(logError);
                            }, 1100);
                        } else {
                            alert(getLongErrorMessage(result.status, result.responseText));
                        }
                    })
                    .catch((e) => {
                        logError(e);
                        alert(formatJSErrorMessage(e));
                    });
            }

            scheduleProcessing();
        },
        onTitleVote: async (title: TitleResult, downvote: boolean): Promise<boolean> => {
            const titleSubmission = { title: title.title, original: title.original };
            let result: FetchResponse;
            try {
                result = await submitVideoBranding(
                    videoSlug as VideoID, titleSubmission, null, downvote, false, "Nebula"
                );
            } catch (e) {
                logError(e);
                alert(formatJSErrorMessage(e));
                return false;
            }

            if (!result || !result.ok) {
                alert(getLongErrorMessage(result.status, result.responseText));
                return false;
            }

            // Update local unsubmitted state
            if (!downvote) {
                if (shouldStoreVotes()) {
                    const unsubmitted = Config.local!.unsubmitted[videoSlug] ??= {
                        titles: [],
                        thumbnails: []
                    };
                    unsubmitted.titles.forEach((t) => t.selected = false);

                    const existing = unsubmitted.titles.find((t) => t.title === title.title);
                    if (existing) {
                        existing.selected = true;
                    } else {
                        unsubmitted.titles.push({ title: title.title, selected: true });
                    }
                    Config.forceLocalUpdate("unsubmitted");
                }
            } else {
                // On downvote, remove from unsubmitted
                const unsubmitted = Config.local!.unsubmitted[videoSlug];
                if (unsubmitted) {
                    const existingTitle = unsubmitted.titles.find((t) => t.title === title.title);
                    if (existingTitle) {
                        unsubmitted.titles.splice(unsubmitted.titles.indexOf(existingTitle), 1);
                        if (unsubmitted.titles.length === 0 && unsubmitted.thumbnails.length === 0 && !unsubmitted.casual) {
                            delete Config.local!.unsubmitted[videoSlug];
                        }
                        Config.forceLocalUpdate("unsubmitted");
                    }
                }
            }

            // Refresh from server
            setTimeout(() => {
                serverBrandingBySlug.delete(videoSlug);
                fetchNebulaServerBranding(videoSlug).catch(logError);
            }, 1100);

            scheduleProcessing();
            return true;
        },
        onThumbnailVote: async (thumbnail: ThumbnailSubmission, downvote: boolean): Promise<boolean> => {
            let result: FetchResponse;
            try {
                result = await submitVideoBranding(
                    videoSlug as VideoID, null, thumbnail, downvote, false, "Nebula"
                );
            } catch (e) {
                logError(e);
                alert(formatJSErrorMessage(e));
                return false;
            }

            if (!result || !result.ok) {
                alert(getLongErrorMessage(result.status, result.responseText));
                return false;
            }

            // Update local unsubmitted state
            if (!downvote) {
                if (shouldStoreVotes()) {
                    saveLocalCustomThumbnail(videoSlug, thumbnail);
                    Config.forceLocalUpdate("unsubmitted");
                }
            } else {
                clearLocalCustomThumbnail(videoSlug);
                runtimeThumbnailPreviewBySlug.delete(videoSlug);
            }

            // Refresh from server
            setTimeout(() => {
                serverBrandingBySlug.delete(videoSlug);
                fetchNebulaServerBranding(videoSlug).catch(logError);
            }, 1100);

            scheduleProcessing();
            return true;
        },
        onClose: () => {
            closeActiveEditor();
        },
    }));

    const onOutsidePointerDown = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (!target) {
            return;
        }

        if (container.contains(target) || titleElement.contains(target)) {
            return;
        }

        closeActiveEditor();
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeActiveEditor();
        }
    };

    const onWindowLayoutChange = useInPageMode
        ? () => {
            const detailsSection = getNebulaVideoDetailsSection();
            if (inPageHost && detailsSection) {
                applyNebulaInPageHostLayout(inPageHost, detailsSection);
            }
        }
        : () => {
            applyNebulaEditorLayout(container, titleElement);
        };

    const modeSwitchDelayMs = 1000;
    let pendingModeSwitchTimeout: number | null = null;
    const cancelPendingModeSwitch = () => {
        if (pendingModeSwitchTimeout == null) {
            return;
        }

        window.clearTimeout(pendingModeSwitchTimeout);
        pendingModeSwitchTimeout = null;
    };

    const scheduleDelayedModeSwitch = () => {
        if (pendingModeSwitchTimeout != null) {
            return;
        }

        pendingModeSwitchTimeout = window.setTimeout(() => {
            pendingModeSwitchTimeout = null;

            if (activeEditor?.container !== container) {
                return;
            }

            closeActiveEditor();
            openYouTubeStyleTitleEditor(titleElement, videoSlug);
        }, modeSwitchDelayMs);
    };

    const syncEditorModeAndLayout = () => {
        const shouldStillUseInPageMode = shouldUseNebulaInPageEditor(titleElement);
        if (shouldStillUseInPageMode !== useInPageMode) {
            scheduleDelayedModeSwitch();
            return;
        }

        cancelPendingModeSwitch();
        onWindowLayoutChange();
    };

    const shouldCloseOnOutsidePointerDown = !useInPageMode && !isWatchPageEditor;

    if (shouldCloseOnOutsidePointerDown) {
        document.addEventListener("mousedown", onOutsidePointerDown, true);
    }
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", syncEditorModeAndLayout, true);

    const theaterModeObserver = new MutationObserver((mutations) => {
        if (didNebulaTheaterModePossiblyChange(mutations)) {
            syncEditorModeAndLayout();
        }
    });

    theaterModeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theater-mode"],
        childList: true,
        subtree: true,
    });

    activeEditor = {
        videoSlug,
        root,
        container,
        inPageHost: useInPageMode ? inPageHost : null,
        theaterModeObserver,
        onOutsidePointerDown: shouldCloseOnOutsidePointerDown ? onOutsidePointerDown : null,
        onKeyDown,
        onWindowLayoutChange: syncEditorModeAndLayout,
        cancelPendingModeSwitch,
    };
}

function closeActiveEditor() {
    if (!activeEditor) {
        return;
    }

    if (activeEditor.onOutsidePointerDown) {
        document.removeEventListener("mousedown", activeEditor.onOutsidePointerDown, true);
    }
    document.removeEventListener("keydown", activeEditor.onKeyDown, true);
    if (activeEditor.onWindowLayoutChange) {
        window.removeEventListener("resize", activeEditor.onWindowLayoutChange, true);
    }
    activeEditor.cancelPendingModeSwitch?.();
    activeEditor.theaterModeObserver?.disconnect();

    activeEditor.root.unmount();
    activeEditor.container.remove();

    if (activeEditor.inPageHost && activeEditor.inPageHost.childElementCount === 0) {
        activeEditor.inPageHost.remove();
    }

    activeEditor = null;
}

function applyNebulaEditorLayout(container: HTMLDivElement, titleElement: HTMLElement) {
    const layout = calculateNebulaEditorLayout(titleElement);

    container.style.width = `${layout.width}px`;
    container.style.left = `${layout.left}px`;
    container.style.top = `${layout.top}px`;
}

function calculateNebulaEditorLayout(titleElement: HTMLElement): {
    left: number;
    top: number;
    width: number;
} {
    const viewportPadding = 8;
    const sideGap = 12;
    const minWidth = 280;
    const defaultWidth = 360;
    const maxWidth = 420;

    const titleRect = titleElement.getBoundingClientRect();
    const videoRect = getCurrentVideoElement()?.getBoundingClientRect() ?? null;

    let width = Math.min(defaultWidth, window.innerWidth - viewportPadding * 2);
    let left = Math.max(viewportPadding, Math.min(titleRect.left, window.innerWidth - width - viewportPadding));
    let top = Math.max(viewportPadding, titleRect.bottom + viewportPadding);

    if (videoRect) {
        const availableRightSpace = window.innerWidth - videoRect.right - sideGap - viewportPadding;

        if (availableRightSpace >= minWidth) {
            width = Math.min(maxWidth, Math.max(minWidth, Math.floor(availableRightSpace)));
            left = Math.max(viewportPadding, Math.min(videoRect.right + sideGap, window.innerWidth - width - viewportPadding));
            top = Math.max(viewportPadding, videoRect.top);
        } else {
            const detailsRect = getNebulaVideoDetailsSection()?.getBoundingClientRect() ?? null;
            const likelyCinemaMode = videoRect.width >= window.innerWidth * 0.75;
            const belowVideoTop = Math.max(videoRect.bottom + sideGap, detailsRect?.top ?? (titleRect.bottom + sideGap));

            if (likelyCinemaMode) {
                width = Math.min(maxWidth, Math.max(minWidth, Math.floor(videoRect.width * 0.42)));
                left = Math.max(viewportPadding, Math.min(videoRect.right - width, window.innerWidth - width - viewportPadding));
            } else {
                width = Math.min(defaultWidth, Math.max(minWidth, window.innerWidth - viewportPadding * 2));
                const alignRightEdge = detailsRect?.right ?? titleRect.right;
                left = Math.max(viewportPadding, Math.min(alignRightEdge - width, window.innerWidth - width - viewportPadding));
            }

            top = Math.max(viewportPadding, belowVideoTop);
        }
    }

    return {
        left: left + window.scrollX,
        top: top + window.scrollY,
        width,
    };
}

function getNebulaVideoDetailsSection(): HTMLElement | null {
    return document.querySelector("section[aria-label='video details']");
}

function applyNebulaDescriptionSurfaceStyle(container: HTMLDivElement) {
    const sourceElement = getNebulaDescriptionSurfaceSource();
    if (!sourceElement) {
        return;
    }

    const style = getComputedStyle(sourceElement);

    if (!isTransparentCssColor(style.backgroundColor)) {
        container.style.setProperty("--cb-nebula-surface", style.backgroundColor);
    }

    if (!isTransparentCssColor(style.borderColor) && style.borderStyle !== "none") {
        container.style.setProperty("--cb-nebula-border", style.borderColor);
    }

    if (style.borderRadius && style.borderRadius !== "0px") {
        container.style.setProperty("--cb-nebula-card-radius", style.borderRadius);
    }
}

function getNebulaDescriptionSurfaceSource(): HTMLElement | null {
    const descriptions = Array.from(document.querySelectorAll("[data-episode-description='true']")) as HTMLElement[];
    if (descriptions.length === 0) {
        return null;
    }

    const visibleDescription = descriptions.find((description) => {
        if (description.hasAttribute("hidden")) {
            return false;
        }

        const style = getComputedStyle(description);
        return style.display !== "none" && style.visibility !== "hidden";
    }) ?? descriptions[0];

    let current: HTMLElement | null = visibleDescription;
    const detailsSection = getNebulaVideoDetailsSection();

    while (current && current !== detailsSection?.parentElement) {
        const style = getComputedStyle(current);
        if (!isTransparentCssColor(style.backgroundColor)) {
            return current;
        }

        current = current.parentElement;
    }

    return null;
}

function isTransparentCssColor(color: string): boolean {
    const normalized = color.trim().toLowerCase();
    return normalized === "transparent"
        || normalized === "rgba(0, 0, 0, 0)"
        || normalized === "rgb(0, 0, 0, 0)";
}

function getNebulaInPageEditorHost(titleElement: HTMLElement): HTMLDivElement | null {
    const detailsSection = titleElement.closest("section[aria-label='video details']") as HTMLElement | null;

    if (!detailsSection) {
        return null;
    }

    let host = detailsSection.querySelector(":scope > .cbNebulaEditorHost") as HTMLDivElement | null;

    if (!host) {
        host = document.createElement("div");
        host.className = "cbNebulaEditorHost";
        detailsSection.appendChild(host);
    }

    applyNebulaInPageHostLayout(host, detailsSection);

    return host;
}

function applyNebulaInPageHostLayout(host: HTMLDivElement, detailsSection: HTMLElement) {
    const titleHeading = detailsSection.querySelector("h1");
    const titleBlock = titleHeading
        ? Array.from(detailsSection.children).find((child) => child.contains(titleHeading)) as HTMLElement | undefined
        : undefined;

    if (host.parentElement !== detailsSection) {
        detailsSection.appendChild(host);
    }

    if (titleBlock && titleBlock !== host && titleBlock.nextElementSibling !== host) {
        titleBlock.insertAdjacentElement("afterend", host);
    } else if (!titleBlock && detailsSection.firstElementChild !== host) {
        detailsSection.insertAdjacentElement("afterbegin", host);
    }

    detailsSection.style.position = "relative";
    host.style.zIndex = "2";
    host.style.position = "relative";
    host.style.left = "0";
    host.style.top = "0";
    host.style.width = "100%";
    host.style.maxWidth = "100%";
    host.style.float = "none";
    host.style.clear = "none";
    host.style.marginTop = "10px";
    host.style.marginBottom = "10px";
    host.style.marginLeft = "0";
    host.style.marginRight = "0";
}

function shouldUseNebulaInPageEditor(titleElement: HTMLElement): boolean {
    const inWatchPage = !!titleElement.closest("section[aria-label='video details']");
    return inWatchPage;
}

function didNebulaTheaterModePossiblyChange(mutations: MutationRecord[]): boolean {
    for (const mutation of mutations) {
        if (mutation.type === "attributes") {
            const target = mutation.target as Element;
            if (target.matches("[data-theater-mode], #video-player[data-video-player-root='true']")) {
                return true;
            }

            continue;
        }

        if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
                if (nodeContainsNebulaTheaterModeMarker(node)) {
                    return true;
                }
            }

            for (const node of mutation.removedNodes) {
                if (nodeContainsNebulaTheaterModeMarker(node)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function nodeContainsNebulaTheaterModeMarker(node: Node): boolean {
    if (!(node instanceof Element)) {
        return false;
    }

    if (node.matches("[data-theater-mode], #video-player[data-video-player-root='true']")) {
        return true;
    }

    return !!node.querySelector("[data-theater-mode], #video-player[data-video-player-root='true']");
}

function saveLocalCustomTitle(videoSlug: string, title: string) {
    const unsubmitted = Config.local!.unsubmitted;
    const existingRecord = unsubmitted[videoSlug] ??= {
        titles: [],
        thumbnails: []
    };

    for (const existingTitle of existingRecord.titles) {
        existingTitle.selected = false;
    }

    const matchingTitle = existingRecord.titles.find((existingTitle) => existingTitle.title.trim() === title);
    if (matchingTitle) {
        matchingTitle.selected = true;
    } else {
        existingRecord.titles.unshift({
            title,
            selected: true
        });
    }

    existingRecord.titles = existingRecord.titles.filter((existingTitle) => existingTitle.selected);

    Config.forceLocalUpdate("unsubmitted");
}

function clearLocalCustomTitle(videoSlug: string) {
    const existingRecord = Config.local!.unsubmitted[videoSlug];
    if (!existingRecord) {
        return;
    }

    existingRecord.titles = existingRecord.titles.filter((existingTitle) => !existingTitle.selected);

    if (existingRecord.titles.length === 0 && existingRecord.thumbnails.length === 0 && !existingRecord.casual) {
        delete Config.local!.unsubmitted[videoSlug];
    }

    Config.forceLocalUpdate("unsubmitted");
}

function getLocalCustomThumbnail(videoSlug: string): ThumbnailSubmission | null {
    const selectedLocalThumbnail = Config.local?.unsubmitted?.[videoSlug]?.thumbnails?.find((thumbnail) => thumbnail.selected);
    if (!selectedLocalThumbnail || selectedLocalThumbnail.original) {
        return null;
    }

    if (!Number.isFinite(selectedLocalThumbnail.timestamp) || selectedLocalThumbnail.timestamp < 0) {
        return null;
    }

    return {
        original: false,
        timestamp: selectedLocalThumbnail.timestamp
    };
}

function saveLocalCustomThumbnail(videoSlug: string, thumbnail: ThumbnailSubmission) {
    const unsubmitted = Config.local!.unsubmitted;
    const existingRecord = unsubmitted[videoSlug] ??= {
        titles: [],
        thumbnails: []
    };

    existingRecord.thumbnails.forEach((existingThumbnail) => existingThumbnail.selected = false);

    const matchingThumbnail = existingRecord.thumbnails.find((existingThumbnail) =>
        (thumbnail.original && existingThumbnail.original)
        || (!thumbnail.original && !existingThumbnail.original && existingThumbnail.timestamp === thumbnail.timestamp)
    );

    if (matchingThumbnail) {
        matchingThumbnail.selected = true;
    } else if (thumbnail.original) {
        existingRecord.thumbnails.unshift({
            original: true,
            selected: true
        });
    } else {
        existingRecord.thumbnails.unshift({
            original: false,
            timestamp: thumbnail.timestamp,
            selected: true
        });
    }

    existingRecord.thumbnails = existingRecord.thumbnails.filter((existingThumbnail) => existingThumbnail.selected);

    Config.forceLocalUpdate("unsubmitted");
}

function clearLocalCustomThumbnail(videoSlug: string) {
    const existingRecord = Config.local!.unsubmitted[videoSlug];
    if (!existingRecord) {
        return;
    }

    existingRecord.thumbnails = existingRecord.thumbnails.filter((existingThumbnail) => !existingThumbnail.selected);

    if (existingRecord.titles.length === 0 && existingRecord.thumbnails.length === 0 && !existingRecord.casual) {
        delete Config.local!.unsubmitted[videoSlug];
    }

    Config.forceLocalUpdate("unsubmitted");
}

function processAnchorThumbnail(anchor: HTMLAnchorElement, videoSlug: string) {
    const customThumbnailUrl = getActiveThumbnailPreview(videoSlug);
    const thumbnailImage = getAnchorThumbnailImage(anchor);
    if (thumbnailImage) {
        applyThumbnailToImage(thumbnailImage, customThumbnailUrl);
    }
}

/**
 * Finds the main thumbnail image inside a video anchor.
 * Picks the largest <img> by rendered area that is likely a video thumbnail
 * (wide aspect ratio, not a tiny icon/avatar).
 */
function getAnchorThumbnailImage(anchor: HTMLAnchorElement): HTMLImageElement | null {
    const images = Array.from(anchor.querySelectorAll("img")) as HTMLImageElement[];
    if (images.length === 0) return null;
    if (images.length === 1) return images[0];

    let best: HTMLImageElement | null = null;
    let bestArea = 0;

    for (const img of images) {
        const w = img.offsetWidth || img.naturalWidth;
        const h = img.offsetHeight || img.naturalHeight;
        if (w === 0 || h === 0) continue;
        if (w < 60 || h < 30) continue;

        const aspect = w / h;
        if (aspect < 1) continue;

        const area = w * h;
        if (area > bestArea) {
            bestArea = area;
            best = img;
        }
    }

    return best ?? images[0];
}

function processWatchPageThumbnail(videoSlug: string) {
    const customThumbnailUrl = getActiveThumbnailPreview(videoSlug);
    const videoElement = getCurrentVideoElement();
    if (!videoElement) {
        return;
    }

    if (!videoElement.dataset.cbNebulaOriginalPosterCaptured) {
        videoElement.dataset.cbNebulaOriginalPoster = videoElement.poster;
        videoElement.dataset.cbNebulaOriginalPosterCaptured = "true";
    }

    if (customThumbnailUrl) {
        if (videoElement.poster !== customThumbnailUrl) {
            videoElement.poster = customThumbnailUrl;
        }
        return;
    }

    const originalPoster = videoElement.dataset.cbNebulaOriginalPoster;
    if (originalPoster != null && videoElement.poster !== originalPoster) {
        videoElement.poster = originalPoster;
    }
}

function getActiveThumbnailPreview(videoSlug: string): string | null {
    if (!shouldReplaceThumbnails()) {
        return null;
    }

    // Local editor preview takes priority (only when we have the actual preview image in memory)
    const localEditorPreview = runtimeThumbnailPreviewBySlug.get(videoSlug);
    if (localEditorPreview && getLocalCustomThumbnail(videoSlug)) {
        return localEditorPreview;
    }

    // Fall back to server-fetched thumbnail from cache
    return serverThumbnailBlobBySlug.get(videoSlug) ?? null;
}

function applyThumbnailToImage(imageElement: HTMLImageElement, customThumbnailUrl: string | null) {
    if (!imageElement.dataset.cbNebulaOriginalSrcCaptured) {
        imageElement.dataset.cbNebulaOriginalSrc = imageElement.getAttribute("src") ?? "";
        imageElement.dataset.cbNebulaOriginalSrcset = imageElement.getAttribute("srcset") ?? "";
        imageElement.dataset.cbNebulaOriginalSrcCaptured = "true";
    }

    if (customThumbnailUrl) {
        if (imageElement.src !== customThumbnailUrl) {
            imageElement.src = customThumbnailUrl;
        }
        imageElement.removeAttribute("srcset");
        imageElement.classList.add("cbNebulaCustomThumbnail");
        return;
    }

    const originalSrc = imageElement.dataset.cbNebulaOriginalSrc ?? "";
    const originalSrcset = imageElement.dataset.cbNebulaOriginalSrcset ?? "";

    if (originalSrc) {
        imageElement.setAttribute("src", originalSrc);
    } else {
        imageElement.removeAttribute("src");
    }

    if (originalSrcset) {
        imageElement.setAttribute("srcset", originalSrcset);
    } else {
        imageElement.removeAttribute("srcset");
    }

    imageElement.classList.remove("cbNebulaCustomThumbnail");
}

function getCurrentVideoElement(): HTMLVideoElement | null {
    return document.querySelector("video");
}

function getNebulaOriginalThumbnailUrl(videoSlug: string, titleElement: HTMLElement): string | null {
    const anchor = titleElement.closest(videoAnchorSelector) as HTMLAnchorElement | null;
    const anchorThumbnail = getAnchorThumbnailUrl(anchor);
    if (anchorThumbnail) {
        return anchorThumbnail;
    }

    const watchPageThumbnail = getWatchPageOriginalThumbnailUrl();
    if (watchPageThumbnail) {
        return watchPageThumbnail;
    }

    return getQueryDataThumbnailUrl(videoSlug);
}

function getAnchorThumbnailUrl(anchor: HTMLAnchorElement | null): string | null {
    if (!anchor) {
        return null;
    }

    const imageElement = anchor.querySelector("img") as HTMLImageElement | null;
    if (!imageElement) {
        return null;
    }

    return imageElement.currentSrc || imageElement.src || imageElement.getAttribute("src") || null;
}

function getWatchPageOriginalThumbnailUrl(): string | null {
    const ogImage = document.querySelector("meta[property='og:image']") as HTMLMetaElement | null;
    const ogImageContent = ogImage?.content?.trim();
    if (ogImageContent) {
        return ogImageContent;
    }

    const videoElement = getCurrentVideoElement();
    if (videoElement?.poster) {
        return videoElement.poster;
    }

    return null;
}

function getQueryDataThumbnailUrl(videoSlug: string): string | null {
    const visitedNodes = new WeakSet<object>();
    const queue: unknown[] = [window.__QUERY_DATA__];
    let fallbackUrl: string | null = null;

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }

        if (typeof current === "string") {
            if (isLikelyThumbnailUrl(current)) {
                if (!fallbackUrl) {
                    fallbackUrl = current;
                }

                if (current.includes(videoSlug)) {
                    return current;
                }
            }

            continue;
        }

        if (typeof current !== "object") {
            continue;
        }

        if (visitedNodes.has(current)) {
            continue;
        }
        visitedNodes.add(current);

        if (Array.isArray(current)) {
            for (const item of current) {
                queue.push(item);
            }
            continue;
        }

        const values = Object.values(current as Record<string, unknown>);
        for (const value of values) {
            queue.push(value);
        }
    }

    return fallbackUrl;
}

function isLikelyThumbnailUrl(urlString: string): boolean {
    if (!/^https?:\/\//iu.test(urlString)) {
        return false;
    }

    try {
        const url = new URL(urlString);
        const pathname = url.pathname.toLowerCase();

        if (/\.(png|jpe?g|webp|avif)$/iu.test(pathname)) {
            return true;
        }

        return pathname.includes("thumbnail") || pathname.includes("thumb");
    } catch {
        return false;
    }
}

import { BackgroundToContentMessage } from "./types/messaging";
import { logError } from "./utils/logger";
import { ChannelIDInfo, checkIfNewVideoID, setupVideoModule, VideoID } from "@ajayyy/maze-utils/lib/video"
import Config from "./config";
import { SubmitButton } from "./submission/submitButton";
import { BrandingLocation, clearVideoBrandingInstances, replaceCurrentVideoBranding } from "./videoBranding/videoBranding";
import { getVideoBranding } from "./dataFetching";
import * as documentScript from "../dist/js/document.js";
import { listenForBadges, listenForMiniPlayerTitleChange, listenForTitleChange } from "./utils/titleBar";
import { getPlaybackFormats } from "./thumbnails/thumbnailData";
import { replaceVideoPlayerSuggestionsBranding } from "./videoBranding/watchPageBrandingHandler";

export const submitButton = new SubmitButton();

async function videoIDChange(videoID: VideoID | null): Promise<void> {
    if (!videoID) return;

    replaceCurrentVideoBranding().catch(logError);
    replaceVideoPlayerSuggestionsBranding().catch(logError);

    try {
        // To update videoID
        submitButton.render();

        const branding = await getVideoBranding(videoID, true, BrandingLocation.Watch);
        if (branding) {
            submitButton.setSubmissions(branding);
        }
    } catch (e) {
        logError(e);
    }
}

function resetValues() {
    submitButton.clearSubmissions();
    submitButton.close();

    clearVideoBrandingInstances();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function channelIDChange(channelIDInfo: ChannelIDInfo): void {
}

function videoElementChange(newVideo: boolean) {
    if (newVideo) {
        submitButton.attachToPage().catch(logError);

        listenForBadges().catch(logError);
        listenForTitleChange().catch(logError);
        listenForMiniPlayerTitleChange().catch(console.error);

        submitButton.render();
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function windowListenerHandler(event: MessageEvent) {
    const data = event.data;
    if (!data) return;
}

function newVideosLoaded(videoIDs: VideoID[]) {
    // Pre-cache the data for these videos
    for (const videoID of videoIDs) {
        getVideoBranding(videoID, false).catch(logError);
        getPlaybackFormats(videoID).catch(logError);
    }
}

export function setupCBVideoModule(): void {
    chrome.runtime.onMessage.addListener((request: BackgroundToContentMessage) => {
        if (request.message === "update") {
            checkIfNewVideoID().catch(logError);
        }
    });

    setupVideoModule({
        videoIDChange: (videoID) => void videoIDChange(videoID).catch(logError),
        channelIDChange,
        videoElementChange,
        resetValues,
        windowListenerHandler,
        newVideosLoaded,
        documentScript: chrome.runtime.getManifest().manifest_version === 2 ? documentScript : undefined
    }, () => Config);
}
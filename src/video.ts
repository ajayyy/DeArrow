import { BackgroundToContentMessage } from "./types/messaging";
import { logError } from "./utils/logger";
import { ChannelIDInfo, checkIfNewVideoID, getVideoID, isOnYTTV, setupVideoModule, VideoID } from "../maze-utils/src/video"
import Config from "./config/config";
import { SubmitButton } from "./submission/submitButton";
import { BrandingLocation, BrandingResult, clearVideoBrandingInstances, replaceCurrentVideoBranding } from "./videoBranding/videoBranding";
import { getVideoBranding } from "./dataFetching";
import * as documentScript from "../dist/js/document.js";
import { listenForBadges, listenForMiniPlayerTitleChange, listenForTitleChange } from "./utils/titleBar";
import { getPlaybackFormats } from "./thumbnails/thumbnailData";
import { replaceVideoPlayerSuggestionsBranding, setupMobileAutoplayHandler } from "./videoBranding/watchPageBrandingHandler";
import { onMobile } from "../maze-utils/src/pageInfo";
import { resetShownWarnings } from "./submission/autoWarning";
import { getAntiTranslatedTitle } from "./titles/titleAntiTranslateData";
import { CasualVoteButton } from "./submission/casualVoteButton";

export const submitButton = new SubmitButton();
export const casualVoteButton = new CasualVoteButton();

async function videoIDChange(videoID: VideoID | null): Promise<void> {
    if (!videoID || isOnYTTV()) return;

    replaceCurrentVideoBranding().catch(logError);

    if (!onMobile()) {
        replaceVideoPlayerSuggestionsBranding().catch(logError);
    }

    try {
        // To update videoID
        submitButton.render();
        casualVoteButton.render();

        const branding = await getVideoBranding(videoID, true, BrandingLocation.Watch);
        if (branding && getVideoID() === videoID) {
            submitButton.setSubmissions(branding);
            casualVoteButton.setExistingVotes(branding.casualVotes);
        }
    } catch (e) {
        logError(e);
    }
}

export function updateSubmitButton(branding: BrandingResult) {
    submitButton.setSubmissions(branding)
    casualVoteButton.setExistingVotes(branding.casualVotes);
}

export function attachSubmitButtonToPage() {
    casualVoteButton.attachToPage().catch(logError);
    submitButton.attachToPage().catch(logError);
}

function resetValues() {
    submitButton.clearSubmissions();
    submitButton.close();
    casualVoteButton.clearExistingVotes();
    casualVoteButton.close();

    clearVideoBrandingInstances();

    resetShownWarnings();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function channelIDChange(channelIDInfo: ChannelIDInfo): void {
}

function videoElementChange(newVideo: boolean) {
    if (newVideo) {
        attachSubmitButtonToPage();

        listenForBadges().catch(logError);
        listenForTitleChange().catch(logError);
        listenForMiniPlayerTitleChange().catch(console.error);

        submitButton.render();
        casualVoteButton.render();
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

        if (Config.config!.ignoreTranslatedTitles) {
            getAntiTranslatedTitle(videoID).catch(logError);
        }
    }
}

function onNavigateToChannel() {
    // For channel trailers
    replaceCurrentVideoBranding().catch(logError);
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
        onNavigateToChannel,
        documentScript: chrome.runtime.getManifest().manifest_version === 2 ? documentScript : undefined,
        allowClipPage: true
    }, () => Config);

    if (onMobile()) {
        setupMobileAutoplayHandler().catch(logError);
    } else {
        document.addEventListener("fullscreenchange", () => {
            // Fix title sometimes being the old title
            setTimeout(() => {
                replaceCurrentVideoBranding().catch(logError);
            }, 100);
        })
    }
}
import { BackgroundToContentMessage } from "./types/messaging";
import { logError } from "./utils/logger";
import { ChannelIDInfo, checkIfNewVideoID, setupVideoModule, VideoID } from "@ajayyy/maze-utils/lib/video"
import Config from "./config";
import { SubmitButton } from "./submission/submitButton";
import { clearVideoBrandingInstances, replaceCurrentVideoBranding } from "./videoBranding/videoBranding";
import { getVideoBranding } from "./dataFetching";


const submitButton = new SubmitButton();

async function videoIDChange(videoID: VideoID | null): Promise<void> {
    if (!videoID) return;

    replaceCurrentVideoBranding().catch(logError);
    
    const branding = await getVideoBranding(videoID, true);
    if (branding) {
        submitButton.setSubmissions(branding);
    }
}

function resetValues() {
    submitButton.clearSubmissions();

    clearVideoBrandingInstances();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function channelIDChange(channelIDInfo: ChannelIDInfo): void {
}

function videoElementChange(newVideo: boolean) {
    if (newVideo) {
        submitButton.attachToPage().catch(logError);
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
        resetValues
    }, () => Config);
}
import { BackgroundToContentMessage } from "./types/messaging";
import { logError } from "./utils/logger";
import { ChannelIDInfo, checkIfNewVideoID, getVideoID, setupVideoModule, VideoID } from "@ajayyy/maze-utils/lib/video"
import Config from "./config";
import { SubmitButton } from "./submission/submitButton";
import { BrandingUUID } from "./videoBranding/videoBranding";
import { getVideoBranding } from "./dataFetching";


const submitButton = new SubmitButton();

async function videoIDChange(videoID: VideoID | null): Promise<void> {
    if (!videoID || videoID === getVideoID()) return;
    
    const branding = await getVideoBranding(videoID, true);
    if (branding) {
        submitButton.setSubmissions(branding);
    }
}

function resetValues() {
    submitButton.clearSubmissions();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function channelIDChange(channelIDInfo: ChannelIDInfo): void {
}

function videoElementChange(newVideo: boolean) {
    if (newVideo) {
        submitButton.attachToPage().catch(console.log);

        setTimeout(() => {
            submitButton.setSubmissions({
                thumbnails: [{
                    original: true,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    timestamp: 10,
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    timestamp: 20,
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    timestamp: 30,
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }],
                titles: [{
                    title: "sample title",
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    title: "sample title 2",
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    title: "original title 2",
                    original: true,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }]
            });
        }, 5000);
        
        setTimeout(() => {
            submitButton.setSubmissions({
                thumbnails: [{
                    original: true,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    timestamp: 25,
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    timestamp: 20,
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }],
                titles: [{
                    title: "sample title",
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    title: "some completely different title",
                    original: false,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }, {
                    title: "original title 2",
                    original: true,
                    votes: 10,
                    locked: false,
                    UUID: "sampleUUID" as BrandingUUID
                }]
            });
        }, 10000);
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
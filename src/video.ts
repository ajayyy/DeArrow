import { BackgroundToContentMessage } from "./types/messaging";
import { logError } from "./utils/logger";
import { ChannelIDInfo, checkIfNewVideoID, setupVideoModule, VideoID } from "@ajayyy/maze-utils/lib/video"
import Config from "./config";
import { SubmitButton } from "./submission/submitButton";
import { BrandingUUID } from "./videoBranding/videoBranding";


const submitButton = new SubmitButton();

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function videoIDChange(id: VideoID | null): void {

    // sponsorsLookup();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function channelIDChange(channelIDInfo: ChannelIDInfo): void {
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function resetValues() {
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
        videoIDChange,
        channelIDChange,
        videoElementChange,
        resetValues
    }, () => Config);
}
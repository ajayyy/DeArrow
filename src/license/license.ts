import { sendRequestToServer } from "../utils/requests";
import Config from "../config/config";

export function isActivated() {
    return Config.config!.activated 
        || freeTrialActive();
}

export function freeTrialActive() {
    const timeLeft = getFreeTrialTimeLeft();
    return timeLeft !== null && timeLeft > 0 && !Config.config!.freeTrialEnded;
}

export function getFreeTrialTimeLeft() {
    return Config.config!.freeTrialStart !== null ? Config.config!.freeTrialDuration - (Date.now() - Config.config!.freeTrialStart) : null;
}

export function isFreeAccessRequestActive() {
    const timeLeft = getFreeAccessRequestTimeLeft();
    return timeLeft !== null && timeLeft > 0;
}

export function getFreeAccessRequestTimeLeft() {
    return Config.config!.freeAccessRequestStart !== null ? Config.config!.freeAccessWaitingPeriod - (Date.now() - Config.config!.freeAccessRequestStart) : null;
}

export async function getLicenseKey(): Promise<string | null> {
    if (Config.config!.licenseKey !== null) {
        return Config.config!.licenseKey;
    } else if (Config.config!.freeActivation && Config.config!.userID) {
        const licenseKey = await generateLicenseKey("free");
        Config.config!.licenseKey = licenseKey;

        return licenseKey;
    }

    return null;
}

async function generateLicenseKey(type: "free") {
    const result = await sendRequestToServer("GET", `/api/generateToken/${type}`, {
        key: Date.now()
    });

    if (result.status === 200) {
        const json = JSON.parse(result.responseText);

        return json.licenseKey ?? null;
    }

    return null;
}

export interface CustomContentScript {
    id: string;
    runAt: "document_start" | "document_end" | "document_idle";
    matches: string[];
    allFrames: boolean;
    js?: string[];
    css?: string[];
}

export function getContentScripts(activated?: boolean): CustomContentScript[] {
    activated ??= isActivated();

    if (activated) {
        return [{
            id: "content",
            runAt: "document_start",
            matches: [
                "https://*.youtube.com/*",
                "https://www.youtube-nocookie.com/embed/*"
            ],
            allFrames: true,
            js: [
                "./js/content.js"
            ],
            css: [
                "content.css",
                "shared.css"
            ]
        }];
    } else {
        return [{
            id: "unactivatedWarning",
            runAt: "document_start",
            matches: [
                "https://*.youtube.com/*",
                "https://www.youtube-nocookie.com/embed/*"
            ],
            allFrames: true,
            js: [
                "./js/unactivatedWarning.js"
            ]
        }];
    }
}

export function askBackgroundToRegisterNeededContentScripts(activated: boolean): Promise<void> {
    return new Promise((resolve) => chrome.runtime.sendMessage({
        message: "registerNeededContentScripts",
        activated
    }, resolve));
}

export function askBackgroundToSetupAlarms(): Promise<void> {
    return new Promise((resolve) => chrome.runtime.sendMessage({
        message: "setupAlarms",
    }, resolve));
}
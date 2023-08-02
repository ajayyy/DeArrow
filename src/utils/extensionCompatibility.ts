import { waitForElement } from "../../maze-utils/src/dom";
import { getVideoID } from "../../maze-utils/src/video";
import { attachSubmitButtonToPage } from "../video";
import { replaceCurrentVideoBranding } from "../videoBranding/videoBranding";
import { logError } from "./logger";
import { getOrCreateTitleButtonContainer } from "./titleBar";

let reduxInstalled: boolean | null = null;
export function isReduxInstalled() {
    if (reduxInstalled === null) {
        reduxInstalled = !!document.querySelector("#redux-style");
    }

    return reduxInstalled;
}

export async function reduxCompatiblity() {
    const node = await getOrCreateTitleButtonContainer();

    if (node && isReduxInstalled() && node.parentElement
            && !node.parentElement.classList.contains("title")) {
        // Wait for redux to replace the node with a new one
        const newTitle = await waitForElement(".ytd-video-primary-info-renderer.title", true);

        if (newTitle) {
            attachSubmitButtonToPage();

            if (getVideoID()) {
                replaceCurrentVideoBranding().catch(logError);
            }
        }
    }
}

export function runCompatibilityFunctions() {
    reduxCompatiblity().catch(logError);
}
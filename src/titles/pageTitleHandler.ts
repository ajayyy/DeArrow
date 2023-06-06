import { waitForElement } from "@ajayyy/maze-utils/lib/dom";
import { logError } from "../utils/logger";

export interface TitleChangeEvent {
    type: "titleChange";
    title: string;
    nodeName?: string;
    forceAllow?: boolean;
}

let targetTitle: string | null = "";
const templateReplacementText = "QbUX6JVUiU5FSomB79jy9FcsR9diQTw";
let currentTitleTemplate = "";
let lastTitle = document.title;

export async function setupPageTitleHandler() {
    const titleElement = await waitForElement('meta[name="title"]') as HTMLElement;
    if (titleElement) {
        const title = titleElement.getAttribute("content");
        if (title) {
            currentTitleTemplate = document.title.replace(title, templateReplacementText);
        }
    }

    lastTitle = document.title;
}

export function onTitleUpdate(e: TitleChangeEvent): void {
    lastTitle = document.title;

    if (targetTitle === null 
            || (!e.forceAllow && e.nodeName !== "YTD-WATCH-FLEXY")) {
        currentTitleTemplate = document.title;
        return;
    }

    const currentVideoTitle = e.title;
    if (currentVideoTitle === targetTitle || !document.title.includes(currentVideoTitle)) {
        return;
    }
    
    currentTitleTemplate = document.title.replace(currentVideoTitle, templateReplacementText);
    document.title = document.title.replace(currentVideoTitle, targetTitle);
}

/**
 * forFuture indicates not to change the title right away, and wait for the next yt-update-title event to handle it
 * 
 * Used for resetting the title to the original title without having the old video title come back
 */
export function setPageTitle(title: string | null, forFuture = false, forceChange = false) {
    if (!forceChange && title === targetTitle) return;

    if (!forFuture) {
        if (title === null) {
            document.title = lastTitle;
        } else if (currentTitleTemplate) {
            document.title = currentTitleTemplate.replace(templateReplacementText, title);
        } else {
            logError("Trying to set page title before title template is set");
        }
    }

    targetTitle = title;
}
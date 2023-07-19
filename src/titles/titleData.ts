import { BrandingUUID } from "../videoBranding/videoBranding";
import { getYouTubeTitleNode } from "../maze-utils/elements"

export interface TitleSubmission {
    title: string;
    original: boolean;
}

export interface TitleResult extends TitleSubmission {
    votes: number;
    locked: boolean;
    UUID: BrandingUUID;
}

export function getCurrentPageTitle(): string | null {
    const titleNode = getYouTubeTitleNode();

    if (titleNode) {
        const formattedText = titleNode.querySelector("yt-formatted-string.ytd-watch-metadata, .slim-video-information-title .yt-core-attributed-string:not(cbCustomTitle)") as HTMLElement;
        if (formattedText) {
            return formattedText.innerText;
        } else {
            for (const elem of titleNode.children) {
                if (elem.nodeName === "#text" && elem.nodeValue 
                        && elem.nodeValue.trim() !== "") {
                    return elem.nodeValue;
                }
            }
        }
    }

    return null;
}
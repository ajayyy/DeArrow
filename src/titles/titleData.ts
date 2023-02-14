import { BrandingUUID } from "../videoBranding/videoBranding";
import { getYouTubeTitleNode } from "@ajayyy/maze-utils/lib/elements"
import { VideoID } from "@ajayyy/maze-utils/lib/video";

export interface TitleResult {
    title: string;
    original: boolean;
    votes: number;
    locked: boolean;
    UUID: BrandingUUID;
}

// eslint-disable-next-line require-await, @typescript-eslint/no-unused-vars
export async function getTitle(videoID: VideoID): Promise<string | null> {
    return null;
}

export function getCurrentPageTitle(): string | null {
    const titleNode = getYouTubeTitleNode();

    if (titleNode) {
        const formattedText = titleNode.querySelector("yt-formatted-string.ytd-watch-metadata") as HTMLElement;
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
import { getYouTubeTitleNodeSelector } from "@ajayyy/maze-utils/lib/elements";
import { getVideoID, VideoID } from "@ajayyy/maze-utils/lib/video";
import { waitForElement } from "@ajayyy/maze-utils/lib/dom";
import { ThumbnailResult } from "../thumbnails/thumbnailData";
import { replaceThumbnail } from "../thumbnails/thumbnailRenderer";
import { TitleResult } from "../titles/titleData";
import { replaceTitle } from "../titles/titleRenderer";

export type BrandingUUID = string & { readonly __brandingUUID: unique symbol };

export interface BrandingResult {
    titles: TitleResult[];
    thumbnails: ThumbnailResult[];
}

export enum BrandingLocation {
    Related,
    Watch
}

export async function replaceCurrentVideoBranding(): Promise<[boolean, boolean]> {
    const title = await waitForElement(getYouTubeTitleNodeSelector()) as HTMLElement;
    const promises: [Promise<boolean>, Promise<boolean>] = [Promise.resolve(false), Promise.resolve(false)]
    const videoID = getVideoID();

    if (title && videoID !== null) {
        promises[0] = replaceTitle(title, videoID, BrandingLocation.Watch, true);
    }

    //todo: replace thumbnail in background of .ytp-cued-thumbnail-overlay-image

    return Promise.all(promises);
}

export function replaceVideoCardBranding(element: HTMLElement): Promise<[boolean, boolean]> {
    const link = element.querySelector("#thumbnail") as HTMLAnchorElement;

    if (link) {
        // todo: fastest would be to preload via /browser request
        const videoID = link.href?.match(/\?v=(.{11})/)?.[1] as VideoID;

        return Promise.all([replaceThumbnail(element, videoID),
            replaceTitle(element, videoID, BrandingLocation.Related, false)]) as Promise<[boolean, boolean]>;
    }

    return new Promise((resolve) => resolve([false, false]));
}

export function startThumbnailListener(): void {
    // hacky prototype
    const elementsDealtWith = new Set<Element>();
    // let stop = 0;
    setInterval(() => {
        // if (stop > 8) return;
        const newElements = [...document.querySelectorAll("ytd-rich-grid-media, ytd-compact-video-renderer")].filter((element) => !elementsDealtWith.has(element));
        for (const element of newElements) {
            elementsDealtWith.add(element);

            void replaceVideoCardBranding(element as HTMLElement);

            // stop++;
            return;
        }
    }, 10);
}
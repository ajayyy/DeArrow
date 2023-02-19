import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { getVideoBranding } from "../dataFetching";

export async function replaceTitle(element: HTMLElement, videoID: VideoID, queryByHash: boolean): Promise<boolean> {
    const titleElement = element.querySelector("#video-title, yt-formatted-string") as HTMLElement;
    //todo: don't replace, but add on another element

    //todo: add an option to not hide title
    titleElement.style.visibility = "hidden";

    const title = (await getVideoBranding(videoID, queryByHash))?.titles?.[0]?.title;
    console.log(title, titleElement.textContent, titleElement.innerHTML)
    if (title) {
        titleElement.innerText = title;
    } else if (titleElement.textContent) {
        // TODO: Allow customizing this rule
        // innerText is blank when visibility hidden
        titleElement.innerText = toTitleCase(titleElement.textContent);
    }

    titleElement.style.visibility = "visible";
    return true;
}

// https://stackoverflow.com/a/196991
function toTitleCase(str: string): string {
    // TODO: ignore some acronyms like AI, allow customizing
    return str.replace(
        /\w\S*/g,
        (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
        }
    );
}
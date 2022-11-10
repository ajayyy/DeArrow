import { VideoID } from "../videoBranding/videoBranding";
import { getTitle } from "./titleData";

export async function replaceTitle(element: HTMLElement, videoID: VideoID): Promise<boolean> {
    const titleElement = element.querySelector("#video-title") as HTMLElement;

    //todo: add an option to not hide title
    titleElement.style.visibility = "hidden";

    const title = await getTitle(videoID);
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
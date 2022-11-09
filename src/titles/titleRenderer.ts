import { VideoID } from "../videoBranding/videoBranding";
import { getTitle } from "./titleData";

export async function replaceTitle(element: HTMLElement, videoID: VideoID): Promise<boolean> {
    const titleElement = element.querySelector("#video-title") as HTMLElement;

    //todo: add an option to not hide title
    titleElement.style.visibility = "hidden";

    const title = await getTitle(videoID);
    if (title) {
        titleElement.innerText = title;
    }

    titleElement.style.visibility = "visible";
    return true;
}
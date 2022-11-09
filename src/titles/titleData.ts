import { VideoID } from "../videoBranding/videoBranding";

// eslint-disable-next-line require-await, @typescript-eslint/no-unused-vars
export async function getTitle(videoID: VideoID): Promise<string> {
    return "Some title goes here";
}
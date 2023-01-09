import { BrandingUUID, VideoID } from "../videoBranding/videoBranding";

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
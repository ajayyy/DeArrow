import { BrandingUUID } from "../videoBranding/videoBranding";

export interface TitleSubmission {
    title: string;
    original: boolean;
}

export interface TitleResult extends TitleSubmission {
    votes: number;
    locked: boolean;
    UUID: BrandingUUID;
}
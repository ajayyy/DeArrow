import { BrandingUUID } from "../videoBranding/videoBranding";
import { ChannelData, channelInfoCache } from "./thumbnailDataCache";
import { ChannelID } from "../../maze-utils/src/video";

interface PartialThumbnailResult {
    votes: number;
    locked: boolean;
    UUID: BrandingUUID;
}

export type CustomThumbnailSubmission = {
    timestamp: number;
    original: false;
};
export type CustomThumbnailResult = PartialThumbnailResult & CustomThumbnailSubmission;

export type OriginalThumbnailSubmission = {
    original: true;
};
export type OriginalThumbnailResult = PartialThumbnailResult & OriginalThumbnailSubmission;

export type ThumbnailResult = CustomThumbnailResult | OriginalThumbnailResult;
export type ThumbnailWithRandomTimeResult = ThumbnailResult & {
    isRandomTime: boolean;
};
export type ThumbnailSubmission = CustomThumbnailSubmission | OriginalThumbnailSubmission;

const activeChannelRequests: Record<ChannelID, Promise<ChannelData>> = {};
export async function fetchChannelnfo(channelID: ChannelID, ignoreCache: boolean): Promise<ChannelData> {
    const cachedData = channelInfoCache.getFromCache(channelID);
    if (!ignoreCache && cachedData?.avatarUrl) {
        return cachedData;
    }

    try {
        const result = activeChannelRequests[channelID] ?? (async () => {
            const metadata = await fetchChannelDataDesktopClient(channelID).catch(() => null);
            if (metadata) {
                const channelInfo = channelInfoCache.setupCache(channelID);
                channelInfo.avatarUrl = metadata.avatarUrl;

                // Remove this from active requests after it's been dealt with in other places
                setTimeout(() => delete activeChannelRequests[channelID], 500);

                return channelInfo;
            }

            return [];
        })();

        activeChannelRequests[channelID] = result;
        return await result;
    } catch (e) { } //eslint-disable-line no-empty

    return {
        avatarUrl: null
    };
}

export async function fetchChannelDataDesktopClient(channelID: ChannelID): Promise<ChannelData> {
    const apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    const url = `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`;
    const data = {
        context: {
            client: {
                clientName: "WEB",
                clientVersion: "2.20240111.00.00",
                platform: "DESKTOP",
            }
        },
        browseId: channelID,
        params: "EgC4AQCSAwDyBgQKAjIA"
    };

    try {
        const result = await fetch(url, {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            method: "POST"
        });

        if (result.ok) {
            const response = await result.json();
            const newChannelID = response?.metadata?.channelMetadataRenderer?.externalId ?? null;
            if (newChannelID !== channelID) {
                return {
                    avatarUrl: null
                };
            }

            const avatarUrl = response?.metadata?.channelMetadataRenderer?.avatar?.thumbnails?.[0]?.url ?? null;
            return {
                avatarUrl
            };
        }

    } catch (e) { } //eslint-disable-line no-empty

    return {
        avatarUrl: null
    };
}
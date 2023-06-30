import { VideoID } from "../maze-utils/video";
import { ChannelInfo, getChannelID, getChannelIDSync } from "../thumbnails/thumbnailData";
import Config, { ThumbnailFallbackOption, TitleFormatting } from "./config";

export function shouldReplaceTitles(videoID: VideoID | null): Promise<boolean> {
    return checkChannelOverrideOption<boolean>(videoID, "replaceTitles");
}

export function shouldReplaceTitlesFastCheck(videoID: VideoID | null): boolean | null {
    return fastChannelOverrideOption<boolean>(videoID, "replaceTitles");
}

export function shouldReplaceThumbnails(videoID: VideoID | null): Promise<boolean> {
    return checkChannelOverrideOption<boolean>(videoID, "replaceThumbnails");
}

export function shouldReplaceThumbnailsFastCheck(videoID: VideoID | null): boolean | null {
    return fastChannelOverrideOption<boolean>(videoID, "replaceThumbnails");
}

export function getTitleFormatting(videoID: VideoID | null): Promise<TitleFormatting> {
    return checkChannelOverrideOption<number>(videoID, "titleFormatting");
}

export function getThumbnailFallbackOption(videoID: VideoID | null): Promise<ThumbnailFallbackOption> {
    return checkChannelOverrideOption<number>(videoID, "thumbnailFallback");
}

export function getThumbnailFallbackOptionFastCheck(videoID: VideoID | null): ThumbnailFallbackOption | null {
    return fastChannelOverrideOption<number>(videoID, "thumbnailFallback");
}

async function checkChannelOverrideOption<T>(videoID: VideoID | null, option: string): Promise<T> {
    if (videoID && Object.keys(Config.config!.channelOverrides).length > 0) {
        return checkChannelOverrideOptionBase(option, await getChannelID(videoID))
    }

    return Config.config![option];
}

function checkChannelOverrideOptionBase<T>(option: string, channelInfo?: ChannelInfo): T {
    if (channelInfo) {
        const { channelID, author } = channelInfo;
        const overrideOptions = [
            channelID ? Config.config!.channelOverrides[channelID] : null,
            author ? Config.config!.channelOverrides[author] : null,
        ]

        for (const override of overrideOptions) {
            if (override && Config.config!.customConfigurations[override] 
                    && Config.config!.customConfigurations[override][option] !== null) {
                return Config.config!.customConfigurations[override][option];
            }
        }
    }

    return Config.config![option];
}

/**
 * Checks if it this variable has any custom config, if not it will return the known value
 */
function fastChannelOverrideOption<T>(videoID: VideoID | null, option: string): T | null {
    const mainValue = Config.config![option];

    if (videoID && Object.keys(Config.config!.customConfigurations).length > 0) {
        const channelInfo = getChannelIDSync(videoID);
        if (channelInfo) {
            // If it's available, use that info now
            return checkChannelOverrideOptionBase(option, channelInfo);
        }

        for (const [, config] of Object.entries(Config.config!.customConfigurations)) {
            if (config && config[option] !== mainValue) {
                return null;
            }
        }
    }

    return mainValue;
}
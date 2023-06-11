import { ProtoConfig } from "@ajayyy/maze-utils/lib/config";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { ThumbnailSubmission } from "./thumbnails/thumbnailData";
import { logError } from "./utils/logger";
import * as CompileConfig from "../config.json";

export interface Permission {
    canSubmit: boolean;
}

export type UnsubmittedThumbnailSubmission = ThumbnailSubmission & {
    selected?: boolean;
}

export interface UnsubmittedTitleSubmission {
    title: string;
    selected?: boolean;
}

export interface UnsubmittedSubmission {
    thumbnails: UnsubmittedThumbnailSubmission[];
    titles: UnsubmittedTitleSubmission[];
}

export enum TitleFormatting {
    Disable = -1,
    CapitalizeWords,
    TitleCase,
    SentenceCase
}

export enum ThumbnailCacheOption {
    Disable,
    OnAllPagesExceptWatch,
    OnAllPages
}

export enum ThumbnailFallbackOption {
    RandomTime,
    Blank,
    Original
}

interface SBConfig {
    userID: string | null;
    vip: boolean;
    allowExpirements: boolean;
    showDonationLink: boolean;
    showUpsells: boolean;
    donateClicked: number;
    darkMode: boolean;
    invidiousInstances: string[];
    keepUnsubmitted: boolean;
    titleFormatting: TitleFormatting;
    serverAddress: string;
    thumbnailServerAddress: string;
    fetchTimeout: number;
    renderTimeout: number;
    thumbnailCacheUse: ThumbnailCacheOption;
    antiAliasThumbnails: boolean;
    showGuidelineHelp: boolean;
    thumbnailFallback: ThumbnailFallbackOption;
    extensionEnabled: boolean;
    importedConfig: boolean;
    replaceTitles: boolean;
    replaceThumbnails: boolean;
}

interface SBStorage {
    navigationApiAvailable: boolean;
    unsubmitted: Record<VideoID, UnsubmittedSubmission>;
}

class ConfigClass extends ProtoConfig<SBConfig, SBStorage> {
    resetToDefault() {
        chrome.storage.sync.set({
            ...this.syncDefaults,
            userID: this.config!.userID
        }).catch(logError);
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function migrateOldSyncFormats(config: SBConfig) {
    
}

const syncDefaults = {
    userID: null,
    vip: false,
    allowExpirements: true,
    showDonationLink: true,
    showUpsells: true,
    donateClicked: 0,
    darkMode: true,
    invidiousInstances: [],
    keepUnsubmitted: true,
    titleFormatting: chrome.i18n.getUILanguage().startsWith("en") ? TitleFormatting.TitleCase : TitleFormatting.Disable,
    serverAddress: CompileConfig.serverAddress,
    thumbnailServerAddress: CompileConfig.thumbnailServerAddress,
    fetchTimeout: 7000,
    renderTimeout: 25000,
    thumbnailCacheUse: ThumbnailCacheOption.OnAllPages,
    antiAliasThumbnails: true,
    showGuidelineHelp: true,
    thumbnailFallback: ThumbnailFallbackOption.RandomTime,
    extensionEnabled: true,
    importedConfig: false,
    replaceTitles: true,
    replaceThumbnails: true
};

const localDefaults = {
    navigationApiAvailable: false,
    unsubmitted: {}
};

const Config = new ConfigClass(syncDefaults, localDefaults, migrateOldSyncFormats);
export default Config;
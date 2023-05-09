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
}

interface SBConfig {
    userID: string | null;
    allowExpirements: boolean;
    showDonationLink: boolean;
    showUpsells: boolean;
    donateClicked: number;
    darkMode: boolean;
    invidiousInstances: string[];
    keepUnsubmitted: boolean;
    titleFormatting: TitleFormatting;
    serverAddress: string;
    fetchTimeout: number;
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
    allowExpirements: true,
    showDonationLink: true,
    showUpsells: true,
    donateClicked: 0,
    darkMode: true,
    invidiousInstances: [],
    keepUnsubmitted: true,
    titleFormatting: TitleFormatting.CapitalizeWords,
    serverAddress: CompileConfig.serverAddress,
    fetchTimeout: 7000
};

const localDefaults = {
    navigationApiAvailable: false,
    unsubmitted: {}
};

const Config = new ConfigClass(syncDefaults, localDefaults, migrateOldSyncFormats);
export default Config;
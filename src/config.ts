import { ProtoConfig } from "@ajayyy/maze-utils/lib/config";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { ThumbnailSubmission } from "./thumbnails/thumbnailData";
import { logError } from "./utils/logger";

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
    CapitalizeWords,
}

interface SBConfig {
    userID: string | null;
    invidiousInstances: string[];
    keepUnsubmitted: boolean;
    titleFormatting: TitleFormatting;
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
    invidiousInstances: [],
    keepUnsubmitted: true,
    titleFormatting: TitleFormatting.CapitalizeWords
};

const localDefaults = {
    navigationApiAvailable: false,
    unsubmitted: {}
};

const Config = new ConfigClass(syncDefaults, localDefaults, migrateOldSyncFormats);
export default Config;
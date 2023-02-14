import { ProtoConfig } from "@ajayyy/maze-utils/lib/config";
import { logError } from "./utils/logger";

export interface Permission {
    canSubmit: boolean;
}

interface SBConfig {
    userID: string | null;
    invidiousInstances: string[];
}

interface SBStorage {
    navigationApiAvailable: boolean;
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
    invidiousInstances: []
};

const localDefaults = {
    navigationApiAvailable: false
};

const Config = new ConfigClass(syncDefaults, localDefaults, migrateOldSyncFormats);
export default Config;
import { Keybind, ProtoConfig } from "../../maze-utils/src/config";
import { VideoID } from "../../maze-utils/src/video";
import { TitleFormatting } from '../../title-formatting/src';
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { logError } from "../utils/logger";
import * as CompileConfig from "../../config.json";

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

export enum ThumbnailCacheOption {
    Disable,
    OnAllPagesExceptWatch,
    OnAllPages
}

export enum ThumbnailFallbackOption {
    RandomTime,
    Blank,
    Original,
    AutoGenerated
}

export enum ThumbnailFallbackAutogeneratedOption {
    Start,
    Middle,
    End
}

export type ConfigurationID = string & { __configurationID: never };

export interface CustomConfiguration {
    name: string;
    replaceTitles: boolean | null;
    replaceThumbnails: boolean | null;
    defaultToCustom: boolean | null;
    useCrowdsourcedTitles: boolean | null;
    titleFormatting: TitleFormatting | null;
    shouldCleanEmojis: boolean | null;
    thumbnailFallback: ThumbnailFallbackOption | null;
    thumbnailFallbackAutogenerated: ThumbnailFallbackAutogeneratedOption | null;
}

const isEnglish = typeof chrome !== "object" || chrome.i18n.getUILanguage().startsWith("en");

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
    keepUnsubmittedInPrivate: boolean;
    thumbnailSaturationLevel: number;
    titleFormatting: TitleFormatting;
    shouldCleanEmojis: boolean;
    onlyTitleCaseInEnglish: boolean;
    serverAddress: string;
    thumbnailServerAddress: string;
    fetchTimeout: number;
    startLocalRenderTimeout: number;
    renderTimeout: number;
    thumbnailCacheUse: ThumbnailCacheOption;
    showGuidelineHelp: boolean;
    thumbnailFallback: ThumbnailFallbackOption;
    thumbnailFallbackAutogenerated: ThumbnailFallbackAutogeneratedOption;
    showLiveCover: boolean;
    extensionEnabled: boolean;
    defaultToCustom: boolean;
    alwaysShowShowOriginalButton: boolean;
    showOriginalOnHover: boolean;
    importedConfig: boolean;
    replaceTitles: boolean;
    replaceThumbnails: boolean;
    useCrowdsourcedTitles: boolean;
    titleMaxLines: number;
    channelOverrides: Record<string, ConfigurationID>;
    customConfigurations: Record<ConfigurationID, CustomConfiguration>;
    showInfoAboutRandomThumbnails: boolean;
    showIconForFormattedTitles: boolean;
    countReplacements: boolean;
    titleReplacements: number;
    thumbnailReplacements: number;
    ignoreAbThumbnails: boolean;
    hideDetailsWhileFetching: boolean;
    licenseKey: string | null;
    activated: boolean;
    alreadyActivated: boolean;
    freeActivation: boolean;
    freeTrialStart: number | null;
    freeTrialEnded: boolean;
    freeAccessRequestStart: number | null;
    freeAccessWaitingPeriod: number;
    firefoxOldContentScriptRegistration: boolean;
    lastIncognitoStatus: boolean;
    showActivatedMessage: boolean;
    openMenuKey: Keybind;
    enableExtensionKey: Keybind;
}

interface SBStorage {
    navigationApiAvailable: boolean;
    unsubmitted: Record<VideoID, UnsubmittedSubmission>;
}

class ConfigClass extends ProtoConfig<SBConfig, SBStorage> {
    resetToDefault() {
        chrome.storage.sync.set({
            ...this.syncDefaults,
            userID: this.config!.userID,
            licenseKey: this.config!.licenseKey,
            freeActivation: this.config!.freeActivation,
            activated: this.config!.activated,
            freeTrialStart: this.config!.freeTrialStart,
            freeTrialEnded: this.config!.freeTrialEnded,
            freeAccessRequestStart: this.config!.freeAccessRequestStart,
            firefoxOldContentScriptRegistration: this.config!.firefoxOldContentScriptRegistration
        }).catch(logError);

        chrome.storage.local.set({
            ...this.localDefaults,
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
    keepUnsubmittedInPrivate: false,
    thumbnailSaturationLevel: 100,
    titleFormatting: isEnglish ? TitleFormatting.TitleCase : TitleFormatting.Disable,
    shouldCleanEmojis: true,
    onlyTitleCaseInEnglish: false,
    serverAddress: CompileConfig.serverAddress,
    thumbnailServerAddress: CompileConfig.thumbnailServerAddress,
    fetchTimeout: 7000,
    startLocalRenderTimeout: 2000,
    renderTimeout: 25000,
    thumbnailCacheUse: ThumbnailCacheOption.OnAllPages,
    showGuidelineHelp: true,
    thumbnailFallback: ThumbnailFallbackOption.RandomTime,
    thumbnailFallbackAutogenerated: ThumbnailFallbackAutogeneratedOption.Start,
    showLiveCover: true,
    extensionEnabled: true,
    defaultToCustom: true,
    alwaysShowShowOriginalButton: false,
    showOriginalOnHover: false,
    importedConfig: false,
    replaceTitles: true,
    replaceThumbnails: true,
    useCrowdsourcedTitles: true,
    titleMaxLines: 3,
    channelOverrides: {},
    customConfigurations: {},
    showInfoAboutRandomThumbnails: false,
    showIconForFormattedTitles: true,
    countReplacements: true,
    titleReplacements: 0,
    thumbnailReplacements: 0,
    ignoreAbThumbnails: true,
    hideDetailsWhileFetching: true,
    licenseKey: null,
    activated: true,
    alreadyActivated: false,
    freeActivation: true,
    freeTrialStart: null,
    freeTrialEnded: false,
    freeAccessRequestStart: null,
    freeAccessWaitingPeriod: 1000 * 60 * 60 * 24 * 3,
    firefoxOldContentScriptRegistration: false,
    lastIncognitoStatus: false,
    showActivatedMessage: false,
    openMenuKey: { key: "d", shift: true },
    enableExtensionKey: { key: "e", shift: true }
};

const localDefaults = {
    navigationApiAvailable: false,
    unsubmitted: {}
};

const Config = new ConfigClass(syncDefaults, localDefaults, migrateOldSyncFormats, true);
export default Config;

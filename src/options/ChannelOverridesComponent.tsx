import * as React from "react";
import { SelectOptionComponent } from "../popup/SelectOptionComponent";
import Config, { ConfigurationID, CustomConfiguration } from "../config/config";
import { generateUserID } from "../../maze-utils/src/setup";
import { ToggleOptionComponent } from "../popup/ToggleOptionComponent";
import { toFirstLetterUppercase, toLowerCaseTitle, toSentenceCase } from "../titles/titleFormatter";

let forceUpdateConfigurationsTimeout: NodeJS.Timeout | null = null;
let forceUpdateOverridesTimeout: NodeJS.Timeout | null = null;

export const ChannelOverridesComponent = () => {
    const [configurations, setConfigurations] = React.useState(Config.config!.customConfigurations);
    const [selectedConfigurationID, setSelectedConfigurationID] = React.useState<ConfigurationID | null>(Object.keys(Config.config!.customConfigurations)[0] as ConfigurationID);
    const [channelListText, setChannelListText] = React.useState("");

    const [configurationName, setConfigurationName] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "name") : "");
    const [replaceTitles, setReplaceTitles] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "replaceTitles") : false);
    const [replaceThumbnails, setReplaceThumbnails] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "replaceThumbnails") : false);
    const [useCrowdsourcedTitles, setUseCrowdsourcedTitles] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "useCrowdsourcedTitles") : false);
    const [defaultToCustom, setDefaultToCustom] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "defaultToCustom") : false);
    const [titleFormatting, setTitleFormatting] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "titleFormatting") : "");
    const [shouldCleanEmojis, setShouldCleanEmojis] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "shouldCleanEmojis") : false);
    const [thumbnailFallback, setThumbnailFallback] = React.useState(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "thumbnailFallback") : "");

    const [hideUseCrowdsourcedTitles, setHideUseCrowdsourcedTitles] = React.useState(!getValueWithDefault(replaceTitles, "replaceTitles"));

    React.useEffect(() => {
        setConfigurationName(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "name") : "");

        const replaceTitles = getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "replaceTitles") : false;
        setReplaceTitles(replaceTitles);

        setUseCrowdsourcedTitles(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "useCrowdsourcedTitles") : false);
        setHideUseCrowdsourcedTitles(!getValueWithDefault(replaceTitles, "replaceTitles"));

        setDefaultToCustom(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "defaultToCustom") : false);

        setReplaceThumbnails(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "replaceThumbnails") : false);
        setTitleFormatting(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "titleFormatting") : "");
        setThumbnailFallback(getConfig(selectedConfigurationID) ? getValue(getConfig(selectedConfigurationID)!, "thumbnailFallback") : "");

        updateChannelList(setChannelListText, selectedConfigurationID!);
    }, [selectedConfigurationID]);

    const [sentenceCaseText, setSentenceCaseText] = React.useState(chrome.i18n.getMessage("SentenceCase"));
    const [lowerCaseText, setLowerCaseText] = React.useState(chrome.i18n.getMessage("LowerCase"));
    const [firstLetterUppercaseText, setFirstLetterUppercaseText] = React.useState(chrome.i18n.getMessage("FirstLetterUppercase"));
    React.useEffect(() => {
        (async () => {
            setSentenceCaseText(await toSentenceCase(chrome.i18n.getMessage("SentenceCase"), false));
            setLowerCaseText(await toLowerCaseTitle(chrome.i18n.getMessage("LowerCase")));
            setFirstLetterUppercaseText(await toFirstLetterUppercase(chrome.i18n.getMessage("FirstLetterUppercase")));
        })();
    }, []);

    return (
        <div className="channelOverrides">

            <div className="channelOverridesTopRow">
                <SelectOptionComponent
                    id="channelOverrides"
                    onChange={(value) => {
                        setSelectedConfigurationID(value as ConfigurationID);
                        updateChannelList(setChannelListText, value as ConfigurationID);
                    }}
                    value={selectedConfigurationID!}
                    options={Object.entries(configurations).map(([key, value]) => ({
                        value: key,
                        label: value.name
                    }))}
                />

                <div 
                    className="option-button trigger-button"
                    onClick={() => {
                        const newID = generateUserID();
                        const newConfiguration: CustomConfiguration = {
                            name: `${chrome.i18n.getMessage("NewConfiguration")} ${Object.keys(Config.config!.customConfigurations).length}`,
                            replaceTitles: null,
                            replaceThumbnails: null,
                            useCrowdsourcedTitles: null,
                            defaultToCustom: null,
                            titleFormatting: null,
                            shouldCleanEmojis: null,
                            thumbnailFallback: null
                        };

                        Config.config!.customConfigurations[newID] = newConfiguration;
                        forceUpdateConfigurations();
                        setConfigurations(Config.config!.customConfigurations);
                        setSelectedConfigurationID(newID as ConfigurationID);

                        updateChannelList(setChannelListText, newID as ConfigurationID);
                    }}>
                    {chrome.i18n.getMessage("NewConfiguration")}
                </div>

            </div>

            {
                selectedConfigurationID != null &&
                <>
                    <input 
                        type="text"
                        id="configurationName"
                        value={configurationName}
                        placeholder={chrome.i18n.getMessage("ConfigurationName")}
                        onChange={(e) => {
                            const newName = e.target.value;
                            getConfig(selectedConfigurationID)!.name = newName;
                            setConfigurationName(newName);

                            forceUpdateConfigurations();
                            setConfigurations(Config.config!.customConfigurations);
                        }}/>

                    <div>
                        {chrome.i18n.getMessage("ChannelListInstructions")}
                    </div>
                
                    <textarea 
                        className="option-text-box" 
                        rows={10} 
                        value={channelListText}
                        onChange={(e) => {
                            const newText = e.target.value;
                            setChannelListText(newText);

                            const channels = newText.split("\n").map((channel) => channel.trim()).filter((channel) => channel !== "");
                            if (channels.length > 0) {
                                for (const [channelID, id] of Object.entries(Config.config!.channelOverrides)) {
                                    if (id === selectedConfigurationID) {
                                        if (!channels.includes(channelID)) {
                                            delete Config.config!.channelOverrides[channelID];
                                        }
                                    }
                                }

                                for (const channel of channels) {
                                    Config.config!.channelOverrides[channel] = selectedConfigurationID;
                                }
                            }

                            forceUpdateOverrides();
                        }}/>

                    {/* Replace titles/thumbnails */}
                    <ToggleOptionComponent
                        id="replaceTitles"
                        onChange={(value) => {
                            updateValue(getConfig(selectedConfigurationID)!, "replaceTitles", value, setReplaceTitles);

                            if (!value) {
                                setTimeout(() => setHideUseCrowdsourcedTitles(true), 300);
                            } else {
                                setHideUseCrowdsourcedTitles(false);
                            }
                        }}
                        value={getValueWithDefault(replaceTitles, "replaceTitles")}
                        label={chrome.i18n.getMessage("replaceTitles")}
                        className={getClassNames(replaceTitles)}
                        showResetButton={shouldShowResetButton(replaceTitles)}
                        onReset={() => {
                            updateValue(getConfig(selectedConfigurationID)!, "replaceTitles", null, setReplaceTitles);

                            if (!Config.config!.replaceTitles) {
                                setTimeout(() => setHideUseCrowdsourcedTitles(true), 300);
                            } else {
                                setHideUseCrowdsourcedTitles(false);
                            }
                        }}
                    />
                    <ToggleOptionComponent
                        id="replaceThumbnails"
                        onChange={(value) => {
                            updateValue(getConfig(selectedConfigurationID)!, "replaceThumbnails", value, setReplaceThumbnails);
                        }}
                        value={getValueWithDefault(replaceThumbnails, "replaceThumbnails")}
                        label={chrome.i18n.getMessage("replaceThumbnails")}
                        className={getClassNames(replaceThumbnails)}
                        showResetButton={shouldShowResetButton(replaceThumbnails)}
                        onReset={() => {
                            updateValue(getConfig(selectedConfigurationID)!, "replaceThumbnails", null, setReplaceThumbnails);
                        }}
                    />
                    <ToggleOptionComponent
                        id="useCrowdsourcedTitles"
                        onChange={(value) => {
                            updateValue(getConfig(selectedConfigurationID)!, "useCrowdsourcedTitles", value, setUseCrowdsourcedTitles);
                        }}
                        value={getValueWithDefault(useCrowdsourcedTitles, "useCrowdsourcedTitles")}
                        label={chrome.i18n.getMessage("useCrowdsourcedTitles")}
                        className={getClassNames(useCrowdsourcedTitles) 
                            + (!getValueWithDefault(replaceTitles, "replaceTitles") ? " hiding" : "")
                            + (hideUseCrowdsourcedTitles ? " hidden" : "")}
                        showResetButton={shouldShowResetButton(useCrowdsourcedTitles)}
                        onReset={() => {
                            updateValue(getConfig(selectedConfigurationID)!, "useCrowdsourcedTitles", null, setUseCrowdsourcedTitles);
                        }}
                    />
                    <ToggleOptionComponent
                        id="defaultToCustom"
                        onChange={(value) => {
                            updateValue(getConfig(selectedConfigurationID)!, "defaultToCustom", !value, setDefaultToCustom);
                        }}
                        value={!getValueWithDefault(defaultToCustom, "defaultToCustom")}
                        label={chrome.i18n.getMessage("defaultToOriginals")}
                        className={getClassNames(defaultToCustom)}
                        showResetButton={shouldShowResetButton(defaultToCustom)}
                        onReset={() => {
                            updateValue(getConfig(selectedConfigurationID)!, "defaultToCustom", null, setDefaultToCustom);
                        }}
                    />

                    <SelectOptionComponent
                        id="titleFormatting"
                        onChange={(value) => {
                            updateValue(getConfig(selectedConfigurationID)!, "titleFormatting", parseInt(value, 10), setTitleFormatting);
                        }}
                        value={getValueWithDefault(titleFormatting, "titleFormatting")}
                        label={chrome.i18n.getMessage("titleFormatting")}
                        className={getClassNames(titleFormatting)}
                        options={[
                            { value: "-1", label: chrome.i18n.getMessage("Disabled") },
                            { value: "1", label: chrome.i18n.getMessage("TitleCase") },
                            { value: "2", label: sentenceCaseText },
                            { value: "3", label: lowerCaseText },
                            { value: "4", label: firstLetterUppercaseText },
                            { value: "0", label: chrome.i18n.getMessage("CapitalizeWords") },
                        ]}
                        showResetButton={shouldShowResetButton(titleFormatting)}
                        onReset={() => {
                            updateValue(getConfig(selectedConfigurationID)!, "titleFormatting", null, setTitleFormatting);
                        }}
                    />

                    <ToggleOptionComponent
                        id="shouldCleanEmojis"
                        onChange={(value) => {
                            updateValue(getConfig(selectedConfigurationID)!, "shouldCleanEmojis", value, setShouldCleanEmojis);
                        }}
                        value={getValueWithDefault(shouldCleanEmojis, "shouldCleanEmojis")}
                        label={chrome.i18n.getMessage("shouldCleanEmojis")}
                        className={getClassNames(shouldCleanEmojis)}
                        showResetButton={shouldShowResetButton(shouldCleanEmojis)}
                        onReset={() => {
                            updateValue(getConfig(selectedConfigurationID)!, "shouldCleanEmojis", null, setShouldCleanEmojis);
                        }}
                    />

                    <SelectOptionComponent
                        id="thumbnailFallback"
                        onChange={(value) => {
                            updateValue(getConfig(selectedConfigurationID)!, "thumbnailFallback", parseInt(value, 10), setThumbnailFallback);
                        }}
                        value={getValueWithDefault(thumbnailFallback, "thumbnailFallback")}
                        label={chrome.i18n.getMessage("thumbnailFallbackOption")}
                        className={getClassNames(thumbnailFallback)}
                        options={[
                            { value: "0", label: chrome.i18n.getMessage("RandomTime") },
                            { value: "1", label: chrome.i18n.getMessage("showABlankBox") },
                            { value: "2", label: chrome.i18n.getMessage("TheOriginalThumbnail") },
                        ]}
                        showResetButton={shouldShowResetButton(thumbnailFallback)}
                        onReset={() => {
                            updateValue(getConfig(selectedConfigurationID)!, "thumbnailFallback", null, setThumbnailFallback);
                        }}
                    />

                    <div 
                        className="option-button trigger-button"
                        onClick={() => {
                            if (confirm(chrome.i18n.getMessage("areYouSureDeleteConfig"))) {
                                delete Config.config!.customConfigurations[selectedConfigurationID];
                                forceUpdateConfigurations();

                                for (const [channelID, id] of Object.entries(Config.config!.channelOverrides)) {
                                    if (id === selectedConfigurationID) {
                                        delete Config.config!.channelOverrides[channelID];
                                    }
                                }
                                forceUpdateOverrides();

                                setConfigurations(Config.config!.customConfigurations);
                                const newID = Object.keys(Config.config!.customConfigurations)[0] as ConfigurationID;
                                setSelectedConfigurationID(newID);

                                updateChannelList(setChannelListText, newID);
                            }
                        }}>
                        {chrome.i18n.getMessage("DeleteConfiguration")}
                    </div>
                </>
            }

            {
                selectedConfigurationID == null &&
                <div className="no-configurations">
                    {chrome.i18n.getMessage("NoConfigurationsSetup")}
                </div>
            }

        </div>
    );
};

function getConfig(selectedConfigurationID: ConfigurationID | null) {
    return selectedConfigurationID ? Config.config!.customConfigurations[selectedConfigurationID] : null;
}

function updateValue(selectedConfiguration: CustomConfiguration, option: string, value: unknown, setFunction: (value: unknown) => void) {
    selectedConfiguration[option] = value;
    forceUpdateConfigurations();

    setFunction(value);
}

function getValue(selectedConfiguration: CustomConfiguration, option: string) {
    return selectedConfiguration[option];
}

function getValueWithDefault<T>(value: T, option: string): T {
    return value ?? Config.config![option];
}

function getClassNames(value: unknown | null) {
    return `cb-channel-override-option ${value === null || value === undefined ? "partiallyHidden" : ""}`;
}

function shouldShowResetButton(value: unknown | null) {
    return value !== null && value !== undefined;
}

function forceUpdateConfigurations() {
    if (forceUpdateConfigurationsTimeout) {
        clearTimeout(forceUpdateConfigurationsTimeout);
    }

    forceUpdateConfigurationsTimeout = setTimeout(() => {
        Config.forceSyncUpdate("customConfigurations");
    }, 50);
}

function forceUpdateOverrides() {
    if (forceUpdateOverridesTimeout) {
        clearTimeout(forceUpdateOverridesTimeout);
    }

    forceUpdateOverridesTimeout = setTimeout(() => {
        Config.forceSyncUpdate("channelOverrides");
    }, 50);
}

function updateChannelList(setChannelListText: (value: string) => void, selectedConfigurationID: ConfigurationID) {
    setChannelListText(Object.entries(Config.config!.channelOverrides)
        .filter(([, id]) => id === selectedConfigurationID)
        .map(([channelID]) => channelID).join("\n"))
}
import * as React from "react";
import Config, { ConfigurationID } from "../config/config";
import { showDonationLink } from "../utils/configUtils";
import { YourWorkComponent } from "./YourWorkComponent";
import { ToggleOptionComponent } from "./ToggleOptionComponent";
import { FormattingOptionsComponent } from "./FormattingOptionsComponent";
import { isSafari } from "../../maze-utils/src/config";
import { isActivated } from "../license/license";
import { LicenseComponent } from "../license/LicenseComponent";
import { FormattedText } from "./FormattedTextComponent";
import { SelectOptionComponent } from "./SelectOptionComponent";
import { getChannelOverrideID, VideoOverrideData } from "../config/channelOverrides";

type ChannelOverridesAction = "forJustThisVideo" | "forThisChannel" | null;
interface ChannelOverridesOption {
    name: ChannelOverridesAction;
    active: (videoData: VideoOverrideData) => boolean;
}

interface ChannelOverrideRadioButtonsProps {
    selected: ChannelOverridesAction;
    setSelected: (s: ChannelOverridesAction, updateConfig: boolean) => void;
    disabled: boolean;
    configID: ConfigurationID | null;
    videoData: VideoOverrideData;
}

interface ChannelOverrideActionComponentProps {
    selected: boolean;
    setSelected: (s: boolean) => void;
    highlighted: boolean;
    disabled: boolean;
    overridden: boolean;
    label: string;
}


export const PopupComponent = () => {
    const [extensionEnabled, setExtensionEnabled] = React.useState(Config.config!.extensionEnabled);
    const [replaceTitles, setReplaceTitles] = React.useState(Config.config!.replaceTitles);
    const [replaceThumbnails, setReplaceThumbnails] = React.useState(Config.config!.replaceThumbnails);
    const [titleFormatting, setTitleFormatting] = React.useState(Config.config!.titleFormatting);

    const [videoData, setVideoOverrideData] = React.useState<VideoOverrideData | null>(null);
    React.useEffect(() => {
        loadVideoOverrideData().then((d) => {
            if (d) {
                setVideoOverrideData(d);
            }
        });
    }, []);

    return (
        <>
            <header className="sbPopupLogo">
                <img src="icons/logo.svg" alt="DeArrow Logo" width="40" height="40" id="dearrowPopupLogo"/>
                <p className="u-mZ">
                    <FormattedText
                        text="DeArrow"
                        titleFormatting={titleFormatting}
                    />
                </p>
            </header>

            {
                (!Config.config!.activated) &&
                <div className="activation-needed">
                    {
                        !isActivated() &&
                        <p>
                            {chrome.i18n.getMessage("DeArrowNotActivated")}
                        </p>
                    }

                    <div className="option-button"
                        onClick={() => {
                            void chrome.runtime.sendMessage({ message: "openPayment" });
                        }}>
                        {chrome.i18n.getMessage("ActivateDeArrow")}
                    </div>
                </div>
            }

            {
                isActivated() &&
                <>
                    {/* Toggle Box */}
                    <div className="sbControlsMenu">
                        {
                            videoData?.videoID &&
                                <ChannelOverridesButton
                                    videoData={videoData}
                                />
                        }
                        {/* github: mbledkowski/toggle-switch */}
                        <label id="disableExtension" htmlFor="toggleSwitch" className="toggleSwitchContainer sbControlsMenu-item">
                        <span className="toggleSwitchContainer-switch">
                            <input type="checkbox" 
                                style={{ "display": "none" }} 
                                id="toggleSwitch" 
                                checked={extensionEnabled}
                                onChange={(e) => {
                                    Config.config!.extensionEnabled = e.target.checked;
                                    setExtensionEnabled(e.target.checked)
                                }}/>
                            <span className="switchBg shadow"></span>
                            <span className="switchBg white"></span>
                            <span className="switchBg blue"></span>
                            <span className="switchDot"></span>
                        </span>
                        <span id="disableSkipping" className={extensionEnabled ? " hidden" : ""}>
                            <FormattedText
                                langKey="disable"
                                titleFormatting={titleFormatting}
                            />
                        </span>
                        <span id="enableSkipping" className={!extensionEnabled ? " hidden" : ""}>
                            <FormattedText
                                langKey="Enable"
                                titleFormatting={titleFormatting}
                            />
                        </span>
                        </label>
                        <button id="optionsButton" 
                            className="sbControlsMenu-item" 
                            title={chrome.i18n.getMessage("Options")}
                            onClick={() => {
                                chrome.runtime.sendMessage({ "message": "openConfig" });
                            }}>
                        <img src="/icons/settings.svg" alt="Settings icon" width="23" height="23" className="sbControlsMenu-itemIcon" id="sbPopupIconSettings" />
                            <FormattedText
                                langKey="Options"
                                titleFormatting={titleFormatting}
                            />
                        </button>
                    </div>

                    {/* Replace titles/thumbnails */}
                    <ToggleOptionComponent
                        id="replaceTitles"
                        onChange={(value) => {
                            setReplaceTitles(value);
                            Config.config!.replaceTitles = value;
                        }}
                        value={replaceTitles}
                        label={chrome.i18n.getMessage("replaceTitles")}
                        titleFormatting={titleFormatting}
                    />

                    <ToggleOptionComponent
                        id="replaceThumbnails"
                        style={{
                            paddingTop: "15px"
                        }}
                        onChange={(value) => {
                            setReplaceThumbnails(value);
                            Config.config!.replaceThumbnails = value;
                        }}
                        value={replaceThumbnails}
                        label={chrome.i18n.getMessage("replaceThumbnails")}
                        titleFormatting={titleFormatting}
                    />

                    <FormattingOptionsComponent
                        titleFormatting={titleFormatting}
                        setTitleFormatting={setTitleFormatting}
                    />

                    {/* Your Work box */}
                    <YourWorkComponent titleFormatting={titleFormatting}/>
                </>
            }

            {/* Footer */}
            <footer id="sbFooter">
                {
                    isActivated() &&
                    <a id="helpButton"
                        onClick={() => {
                            chrome.runtime.sendMessage({ "message": "openHelp" });
                        }}>
                            <FormattedText
                                langKey="help"
                                titleFormatting={titleFormatting}
                            />
                    </a>
                }
                <a href="https://dearrow.ajay.app" target="_blank" rel="noreferrer">
                    <FormattedText
                        langKey="website"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <a href="https://dearrow.ajay.app/stats" target="_blank" rel="noreferrer" className={isSafari() ? " hidden" : ""}>
                    <FormattedText
                        langKey="viewLeaderboard"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <a href="https://dearrow.ajay.app/donate" target="_blank" rel="noreferrer" className={!showDonationLink() ? " hidden" : ""}>
                    <FormattedText
                        langKey="Donate"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <br />
                <a href="https://github.com/ajayyy/DeArrow" target="_blank" rel="noreferrer">
                    <FormattedText
                        text="GitHub"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <a href="https://discord.gg/SponsorBlock" target="_blank" rel="noreferrer">
                    <FormattedText
                        text="Discord"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <a href="https://matrix.to/#/#sponsor:ajay.app?via=ajay.app&via=matrix.org&via=mozilla.org" target="_blank" rel="noreferrer">
                    <FormattedText
                        text="Matrix"
                        titleFormatting={titleFormatting}
                    />
                </a>
            </footer>

            <LicenseComponent titleFormatting={titleFormatting} />
        </>
    );
};

function ChannelOverridesButton(props: { videoData: VideoOverrideData }): JSX.Element {
    const [menuOpen, setMenuOpen] = React.useState(false);
    const channelOverrideId = getChannelOverrideID(props.videoData);

    React.useEffect(() => {
        setMenuOpen(false);
    }, [props.videoData]);

    return (
        <>
            <label id="skipProfileButton" 
                    htmlFor="skipProfileToggle"
                    className="toggleSwitchContainer sbControlsMenu-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        setMenuOpen(!menuOpen);
                    }}>
                <svg viewBox="0 0 24 24" width="23" height="23" className={"SBWhitelistIcon sbControlsMenu-itemIcon " + (menuOpen ? " rotated" : "")}>
                    <path d="M24 10H14V0h-4v10H0v4h10v10h4V14h10z" />
                </svg>
                <span id="whitelistChannel" className={!(!menuOpen && !channelOverrideId) ? " hidden" : ""}>
                    {chrome.i18n.getMessage("addChannelToSkipProfile")}
                </span>
                <span id="whitelistChannel" className={!(!menuOpen && channelOverrideId) ? " hidden" : ""}>
                    {chrome.i18n.getMessage("editActiveSkipProfile")}
                </span>
                <span id="unwhitelistChannel" className={!menuOpen ? " hidden" : ""}>
                    {chrome.i18n.getMessage("closeSkipProfileMenu")}
                </span>
            </label>

            <ChannelOverridesMenu open={menuOpen} videoData={props.videoData} />
        </>
    );
}

const channelOverridesOptions: ChannelOverridesOption[] = [{
        name: "forJustThisVideo",
        active: (d) => getChannelOverrideID(d, { onlyVideo: true }) !== null
    }, {
        name: "forThisChannel",
        active: (d) => getChannelOverrideID(d, { onlyChannelID: true }) !== null
    }];

function ChannelOverridesMenu(props: { open: boolean; videoData: VideoOverrideData }): JSX.Element {
    const [configID, setConfigID] = React.useState<ConfigurationID | null>(null);
    const [selectedOverrideAction, setSelectedOverrideAction] = React.useState<ChannelOverridesAction>(null);
    const [allConfigurations, setAllConfigurations] = React.useState(Object.entries(Config.config!.customConfigurations));

    React.useEffect(() => {
        setConfigID(getChannelOverrideID(props.videoData));
    }, [props.videoData]);

    React.useEffect(() => {
        Config.configSyncListeners.push(() => {
            setAllConfigurations(Object.entries(Config.config!.customConfigurations));
        });
    }, []);

    return (
        <div id="skipProfileMenu" className={`${!props.open ? " hidden" : ""}`}
            aria-label={chrome.i18n.getMessage("SkipProfileMenu")}>
            <div style={{position: "relative"}}>
                <SelectOptionComponent
                    id="sbSkipProfileSelection"
                    label={chrome.i18n.getMessage("SelectASkipProfile")}
                    onChange={(value) => {
                        if (value === "new") {
                            chrome.runtime.sendMessage({ message: "openConfig", hash: "newProfile" });
                            return;
                        }
                        
                        const configID = value === "null" ? null : value as ConfigurationID;
                        setConfigID(configID);
                        if (configID === null) {
                            setSelectedOverrideAction(null);
                        }

                        if (selectedOverrideAction) {
                            updateChannelOverrideSetting(props.videoData, selectedOverrideAction, configID);

                            if (configID === null) {
                                for (const option of channelOverridesOptions) {
                                    if (option.name !== selectedOverrideAction && option.active(props.videoData)) {
                                        updateChannelOverrideSetting(props.videoData, option.name, null);
                                    }
                                }
                            }
                        }
                    }}
                    value={configID ?? "null"}
                    options={[{
                        value: "null",
                        label: chrome.i18n.getMessage("DefaultConfiguration")
                    }].concat(allConfigurations.map(([key, value]) => ({
                        value: key,
                        label: value.name
                    }))).concat([{
                        value: "new",
                        label: chrome.i18n.getMessage("CreateNewConfiguration")
                    }])}
                />

                <ChannelOverrideRadioButtons
                    selected={selectedOverrideAction}
                    setSelected={(s, updateConfig) => {
                        if (updateConfig) {
                            if (s === null) {
                                updateChannelOverrideSetting(props.videoData, selectedOverrideAction, null);
                            } else {
                                updateChannelOverrideSetting(props.videoData, s, configID);
                            }
                        } else if (s !== null) {
                            setConfigID(getChannelOverrideID(props.videoData));
                        }

                        setSelectedOverrideAction(s);
                    }}
                    disabled={configID === null}
                    configID={configID}
                    videoData={props.videoData}
                />
            </div>
        </div>
    );
}

function ChannelOverrideRadioButtons(props: ChannelOverrideRadioButtonsProps): JSX.Element {
    const result: JSX.Element[] = [];

    React.useEffect(() => {
        if (props.configID === null) {
            props.setSelected(null, false);
        } else {
            for (const option of channelOverridesOptions) {
                if (option.active(props.videoData)) {
                    if (props.selected !== option.name) {
                        props.setSelected(option.name, false);
                    }

                    return;
                }
            }
        }
    }, [props.configID, props.videoData, props.selected]);

    let alreadySelected = false;
    for (const option of channelOverridesOptions) {
        const highlighted = option.active(props.videoData) && props.selected !== option.name;
        const overridden = !highlighted && alreadySelected;
        result.push(
            <ChannelOverrideActionComponent
                highlighted={highlighted}
                label={chrome.i18n.getMessage(`skipProfile_${option.name}`)}
                selected={props.selected === option.name}
                overridden={overridden}
                disabled={props.disabled || overridden}
                key={option.name}
                setSelected={(s) => {
                    props.setSelected(s ? option.name : null, true);
                }}/>
        );

        if (props.selected === option.name) {
            alreadySelected = true;
        }
    }

    return <div id="skipProfileActions">
        {result}
    </div>
}

function ChannelOverrideActionComponent(props: ChannelOverrideActionComponentProps): JSX.Element {
    let title = "";
    if (props.selected) {
        title = chrome.i18n.getMessage("clickToNotApplyThisProfile");
    } else if ((props.highlighted && !props.disabled) || props.overridden) {
        title = chrome.i18n.getMessage("skipProfileBeingOverriddenByHigherPriority");
    } else if (!props.highlighted && !props.disabled) {
        title = chrome.i18n.getMessage("clickToApplyThisProfile");
    } else if (props.disabled) {
        title = chrome.i18n.getMessage("selectASkipProfileFirst");
    }

    return (
        <div className={`skipOptionAction ${props.selected ? "selected" : ""} ${props.highlighted ? "highlighted" : ""} ${props.disabled ? "disabled" : ""}`}
            title={title}
            role="button"
            tabIndex={0}
            aria-pressed={props.selected}
            onClick={() => {
                // Need to uncheck or disable a higher priority option first
                if (!props.disabled && !props.highlighted) {
                    props.setSelected(!props.selected);
                }
            }}>
            {props.label}
        </div>
    );
}

function updateChannelOverrideSetting(videoData: VideoOverrideData, action: ChannelOverridesAction, configID: ConfigurationID | null) {
    switch (action) {
        case "forJustThisVideo":
            if (configID) {
                Config.config!.channelOverrides[videoData.videoID] = configID;
            } else {
                delete Config.config!.channelOverrides[videoData.videoID];
            }

            Config.forceSyncUpdate("channelOverrides");
            break;
        case "forThisChannel": {
            if (!videoData.channelHandle) {
                alert(chrome.i18n.getMessage("channelDataNotFound"));
                return;
            }

            if (configID) {
                Config.config!.channelOverrides[videoData.channelHandle] = configID;
            } else {
                delete Config.config!.channelOverrides[videoData.channelHandle];
                delete Config.config!.channelOverrides[videoData.channelID!];
                delete Config.config!.channelOverrides[videoData.channelName!];
            }

            Config.forceSyncUpdate("channelOverrides");
            break;
        }
    }
}

async function loadVideoOverrideData(): Promise<VideoOverrideData | null> {
    const response = await sendMessage({ message: "getVideoData" });

    if (response && response.videoID) {
        return response;
    } else {
        // Handle error if it exists
        chrome.runtime.lastError;
        return null;
    }
}

interface Message {
    message: string;
}

function sendMessage(request: Message): Promise<VideoOverrideData> {
    return new Promise((resolve) => {
        if (chrome.tabs) {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, request, resolve);
                }
            });
        } else {
            chrome.runtime.sendMessage({ message: "tabs", data: request }, resolve);
        }
    });
}
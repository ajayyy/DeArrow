import * as React from "react";
import Config from "../config";
import { showDonationLink } from "../utils/configUtils";
import { sendRequestToServer } from "../dataFetching";
import { getHash } from "@ajayyy/maze-utils/lib/hash";
import { getErrorMessage } from "@ajayyy/maze-utils/lib/formating";
import { toSentenceCase } from "../titles/titleFormatter";

export const PopupComponent = () => {
    const [extensionEnabled, setExtensionEnabled] = React.useState(Config.config!.extensionEnabled);
    const [isSettingUsername, setIsSettingUsername] = React.useState(false);
    const [username, setUsername] = React.useState("");
    const [newUsername, setNewUsername] = React.useState("");
    const [usernameSubmissionStatus, setUsernameSubmissionStatus] = React.useState("");
    const [titleSubmissionCount, setTitleSubmissionCount] = React.useState("");
    const [thumbnailSubmissionCount, setThumbnailSubmissionCount] = React.useState("");
    const [titleFormatting, setTitleFormatting] = React.useState(String(Config.config!.titleFormatting));

    React.useEffect(() => {
        (async () => {
            const values = ["userName", "titleSubmissionCount", "thumbnailSubmissionCount", "vip"];
            const result = await sendRequestToServer("GET", "/api/userInfo", {
                publicUserID: await getHash(Config.config!.userID!),
                values
            });

            if (result.ok) {
                const userInfo = JSON.parse(result.responseText);
                setUsername(userInfo.userName);
                setTitleSubmissionCount(userInfo.titleSubmissionCount);
                setThumbnailSubmissionCount(userInfo.thumbnailSubmissionCount);

                Config.config!.vip = userInfo.vip;
            }
        })();
    }, []);

    return (
        <>
            <header className="sbPopupLogo">
                <img src="icons/logo.svg" alt="DeArrow Logo" width="40" height="40" id="dearrowPopupLogo"/>
                <p className="u-mZ">DeArrow</p>
            </header>

            {/* Toggle Box */}
            <div className="sbControlsMenu">
                {/* github: mbledkowski/toggle-switch */}
                <label id="disableExtension" htmlFor="toggleSwitch" className="toggleSwitchContainer sbControlsMenu-item">
                <span className="toggleSwitchContainer-switch">
                    <input type="checkbox" 
                        style={{ "display": "none" }} 
                        id="toggleSwitch" 
                        checked={extensionEnabled}
                        onChange={(e) => {
                            console.log(e.target.checked)
                            Config.config!.extensionEnabled = e.target.checked;
                            setExtensionEnabled(e.target.checked)
                        }}/>
                    <span className="switchBg shadow"></span>
                    <span className="switchBg white"></span>
                    <span className="switchBg blue"></span>
                    <span className="switchDot"></span>
                </span>
                <span id="disableSkipping" className={extensionEnabled ? " hidden" : ""}>{chrome.i18n.getMessage("disable")}</span>
                <span id="enableSkipping" className={!extensionEnabled ? " hidden" : ""}>{chrome.i18n.getMessage("Enable")}</span>
                </label>
                <button id="optionsButton" 
                    className="sbControlsMenu-item" 
                    title={chrome.i18n.getMessage("optionsInfo")}
                    onClick={() => {
                        chrome.runtime.sendMessage({ "message": "openConfig" });
                    }}>
                <img src="/icons/settings.svg" alt="Settings icon" width="23" height="23" className="sbControlsMenu-itemIcon" id="sbPopupIconSettings" />
                    {chrome.i18n.getMessage("Options")}
                </button>
            </div>
            
            {/* Title Reformatting Option */}
            <div className="optionContainer">
                <label className="optionLabel" htmlFor="titleFormatting">{chrome.i18n.getMessage("titleFormatting")}</label>
                <select id="titleFormatting" 
                    className="selector-element optionsSelector"
                    value={titleFormatting}
                    onChange={(e) => {
                        setTitleFormatting(e.target.value);
                        Config.config!.titleFormatting = parseInt(e.target.value, 10);
                    }}>
                    <option value="-1">{chrome.i18n.getMessage("Disabled")}</option>
                    <option value="1">{chrome.i18n.getMessage("TitleCase")}</option>
                    <option value="2">{toSentenceCase(chrome.i18n.getMessage("SentenceCase"), false)}</option>
                    <option value="0">{chrome.i18n.getMessage("CapitalizeWords")}</option>
                </select>
            </div>

            {/* Your Work box */}
            <div className="sbYourWorkBox">
                <h1 className="sbHeader" style={{ "padding": "8px 15px" }}>
                {chrome.i18n.getMessage("yourWork")}
                </h1>
                <div className="sbYourWorkCols">
                    {/* Username */}
                    <div id="usernameElement">
                        <p className="u-mZ grey-text">{chrome.i18n.getMessage("Username")}:
                            {/* loading/errors */}
                            <span id="setUsernameStatus" 
                                className={`u-mZ white-text${!usernameSubmissionStatus ? " hidden" : ""}`}>
                                {usernameSubmissionStatus}
                            </span>
                        </p>
                        <div id="setUsernameContainer" className={isSettingUsername ? " hidden" : ""}>
                            <p id="usernameValue">{username}</p>
                            <button id="setUsernameButton" 
                                title={chrome.i18n.getMessage("setUsername")}
                                onClick={() => {
                                    setNewUsername(username);
                                    setIsSettingUsername(!isSettingUsername);
                                }}>
                                <img src="/icons/pencil.svg" alt={chrome.i18n.getMessage("setUsername")} width="16" height="16" id="sbPopupIconEdit"/>
                            </button>
                            <button id="copyUserID" 
                                title={chrome.i18n.getMessage("copyPublicID")}
                                onClick={async () => {
                                    window.navigator.clipboard.writeText(await getHash(Config.config!.userID!));
                                }}>
                                <img src="/icons/clipboard.svg" alt={chrome.i18n.getMessage("copyPublicID")} width="16" height="16" id="sbPopupIconCopyUserID"/>
                            </button>
                        </div>
                        <div id="setUsername" className={!isSettingUsername ? " hidden" : " SBExpanded"}>
                            <input id="usernameInput" 
                                placeholder={chrome.i18n.getMessage("Username")}
                                value={newUsername}
                                onChange={(e) => {
                                    setNewUsername(e.target.value);
                                }}/>
                            <button id="submitUsername"
                                onClick={() => {
                                    if (newUsername.length > 0) {
                                        setUsernameSubmissionStatus(chrome.i18n.getMessage("Loading"));
                                        sendRequestToServer("POST", `/api/setUsername?userID=${Config.config!.userID}&username=${newUsername}`)
                                        .then((result) => {
                                            if (result.ok) {
                                                setUsernameSubmissionStatus("");
                                                setUsername(newUsername);
                                                setIsSettingUsername(!isSettingUsername);
                                            } else {
                                                setUsernameSubmissionStatus(getErrorMessage(result.status, result.responseText));
                                            }
                                        }).catch((e) => {
                                            setUsernameSubmissionStatus(`${chrome.i18n.getMessage("Error")}: ${e}`);
                                        });
                                    }
                                }}>
                                <img src="/icons/check.svg" alt={chrome.i18n.getMessage("setUsername")} width="16" height="16" id="sbPopupIconCheck"/>
                            </button>
                        </div>
                    </div>
                    {/* Submissions */}
                    <div id="sponsorTimesContributionsContainer" className={isSettingUsername ? " hidden" : ""}>
                        <p className="u-mZ grey-text">{chrome.i18n.getMessage("Titles")}:</p>
                        <p id="sponsorTimesContributionsDisplay" className="u-mZ">{titleSubmissionCount}</p>
                    </div>
                    <div id="sponsorTimesContributionsContainer" className={isSettingUsername ? " hidden" : ""}>
                        <p className="u-mZ grey-text">{chrome.i18n.getMessage("Thumbnails")}:</p>
                        <p id="sponsorTimesContributionsDisplay" className="u-mZ">{thumbnailSubmissionCount}</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer id="sbFooter">
                <a id="helpButton"
                    onClick={() => {
                        chrome.runtime.sendMessage({ "message": "openHelp" });
                    }}>
                        {chrome.i18n.getMessage("help")}
                </a>
                <a href="https://dearrow.ajay.app" target="_blank" rel="noreferrer">{chrome.i18n.getMessage("website")}</a>
                <a href="https://dearrow.ajay.app/donate" target="_blank" rel="noreferrer" className={!showDonationLink() ? " hidden" : ""}>
                    {chrome.i18n.getMessage("Donate")}
                </a>
                <br />
                <a href="https://github.com/ajayyy/DeArrow" target="_blank" rel="noreferrer">GitHub</a>
                <a href="https://discord.gg/SponsorBlock" target="_blank" rel="noreferrer">Discord</a>
                <a href="https://matrix.to/#/#sponsor:ajay.app?via=ajay.app&via=matrix.org&via=mozilla.org" target="_blank" rel="noreferrer">Matrix</a>
            </footer>
        </>
    );
};
import * as React from "react";
import Config from "../config";
import { showDonationLink } from "../utils/configUtils";
import { toSentenceCase } from "../titles/titleFormatter";
import { YourWorkComponent } from "./YourWorkComponent";

export const PopupComponent = () => {
    const [extensionEnabled, setExtensionEnabled] = React.useState(Config.config!.extensionEnabled);
    const [titleFormatting, setTitleFormatting] = React.useState(String(Config.config!.titleFormatting));

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
                    title={chrome.i18n.getMessage("Options")}
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
            <YourWorkComponent/>

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
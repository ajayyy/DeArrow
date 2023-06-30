import * as React from "react";
import Config from "../config/config";
import { showDonationLink } from "../utils/configUtils";
import { YourWorkComponent } from "./YourWorkComponent";
import { ToggleOptionComponent } from "./ToggleOptionComponent";
import { FormattingOptionsComponent } from "./FormattingOptionsComponent";

export const PopupComponent = () => {
    const [extensionEnabled, setExtensionEnabled] = React.useState(Config.config!.extensionEnabled);
    const [replaceTitles, setReplaceTitles] = React.useState(Config.config!.replaceTitles);
    const [replaceThumbnails, setReplaceThumbnails] = React.useState(Config.config!.replaceThumbnails);

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

            {/* Replace titles/thumbnails */}
            <ToggleOptionComponent
                id="replaceTitles"
                onChange={(value) => {
                    setReplaceTitles(value);
                    Config.config!.replaceTitles = value;
                }}
                value={replaceTitles}
                label={chrome.i18n.getMessage("replaceTitles")}
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
            />

            <FormattingOptionsComponent/>

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
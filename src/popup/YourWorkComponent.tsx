import * as React from "react";
import Config, { TitleFormatting } from "../config/config";
import { sendRequestToServer } from "../utils/requests";
import { getHash } from "../../maze-utils/src/hash";
import { getErrorMessage } from "../../maze-utils/src/formating";
import PencilIcon from "../svgIcons/pencilIcon";
import ClipboardIcon from "../svgIcons/clipboardIcon";
import CheckIcon from "../svgIcons/checkIcon";
import { FormattedText } from "./FormattedTextComponent";

interface YourWorkComponentProps {
    titleFormatting?: TitleFormatting;
}

export const YourWorkComponent = ({ titleFormatting }: YourWorkComponentProps) => {
    const [isSettingUsername, setIsSettingUsername] = React.useState(false);
    const [username, setUsername] = React.useState("");
    const [newUsername, setNewUsername] = React.useState("");
    const [usernameSubmissionStatus, setUsernameSubmissionStatus] = React.useState("");
    const [titleSubmissionCount, setTitleSubmissionCount] = React.useState("");
    const [thumbnailSubmissionCount, setThumbnailSubmissionCount] = React.useState("");
    const [casualSubmissionCount, setCasualSubmissionCount] = React.useState("");

    React.useEffect(() => {
        (async () => {
            const values = ["userName", "titleSubmissionCount", "thumbnailSubmissionCount", "casualSubmissionCount", "vip"];
            const result = await sendRequestToServer("GET", "/api/userInfo", {
                publicUserID: await getHash(Config.config!.userID!),
                values
            });

            if (result.ok) {
                const userInfo = JSON.parse(result.responseText);
                setUsername(userInfo.userName);
                setTitleSubmissionCount(userInfo.titleSubmissionCount);
                setThumbnailSubmissionCount(userInfo.thumbnailSubmissionCount);
                setCasualSubmissionCount(userInfo.casualSubmissionCount);

                Config.config!.vip = userInfo.vip;
            }
        })();
    }, []);

    return (
        <div className="sbYourWorkBox">
            <h2 className="sbHeader" style={{ "padding": "8px 15px" }}>
                <FormattedText
                    langKey="yourWork"
                    titleFormatting={titleFormatting}
                />
            </h2>
            <div className="sbYourWorkCols">
                {/* Username */}
                <div id="cbUsernameElement">
                    <p className="u-mZ cb-grey-text">
                        <FormattedText
                            langKey="Username"
                            titleFormatting={titleFormatting}
                        />:
                        {/* loading/errors */}
                        <span id="setUsernameStatus" 
                            className={`u-mZ cb-white-text${!usernameSubmissionStatus ? " hidden" : ""}`}>
                            {usernameSubmissionStatus}
                        </span>
                    </p>
                    <div id="setUsernameContainer" className={isSettingUsername ? " hidden" : ""}>
                        <p id="usernameValue" className={Config.config!.casualMode ? " usernameWider" : ""}>{username}</p>
                        <button id="setUsernameButton" 
                            title={chrome.i18n.getMessage("setUsername")}
                            onClick={() => {
                                setNewUsername(username);
                                setIsSettingUsername(!isSettingUsername);
                            }}>
                            <PencilIcon id="sbPopupIconEdit" className="cbPopupButton" />
                        </button>
                        <button id="copyUserID" 
                            title={chrome.i18n.getMessage("copyPublicID")}
                            onClick={async () => {
                                window.navigator.clipboard.writeText(await getHash(Config.config!.userID!));
                            }}>
                            <ClipboardIcon id="sbPopupIconCopyUserID" className="cbPopupButton" />
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
                            <CheckIcon id="sbPopupIconCheck" className="cbPopupButton" />
                        </button>
                    </div>
                </div>
                {
                    !Config.config!.casualMode &&
                    <SubmissionCounts
                        isSettingUsername={isSettingUsername}
                        titleSubmissionCount={titleSubmissionCount}
                        thumbnailSubmissionCount={thumbnailSubmissionCount}
                        titleFormatting={titleFormatting}
                    />
                }
            </div>
            {
                Config.config!.casualMode &&
                <div className="sbYourWorkCols">
                    <SubmissionCounts
                        isSettingUsername={isSettingUsername}
                        titleSubmissionCount={titleSubmissionCount}
                        thumbnailSubmissionCount={thumbnailSubmissionCount}
                        titleFormatting={titleFormatting}
                    />
                    <div id="sponsorTimesContributionsContainer" className={isSettingUsername ? " hidden" : ""}>
                        <p className="u-mZ cb-grey-text">
                            <FormattedText
                                langKey="CasualVotes"
                                titleFormatting={titleFormatting}
                            />:
                        </p>
                        <p id="sponsorTimesContributionsDisplay" className="u-mZ">{casualSubmissionCount}</p>
                    </div>
                </div>
            }

            {
                Config.config!.countReplacements && getReplacementsMessage()
            }

            
        </div>
    );
};

function SubmissionCounts(props: {isSettingUsername: boolean; titleSubmissionCount: string; thumbnailSubmissionCount: string; titleFormatting?: TitleFormatting}): JSX.Element {
    return <>
        <div id="sponsorTimesContributionsContainer" className={props.isSettingUsername ? " hidden" : ""}>
            <p className="u-mZ cb-grey-text">
                <FormattedText
                    langKey="Titles"
                    titleFormatting={props.titleFormatting}
                />:
            </p>
            <p id="sponsorTimesContributionsDisplay" className="u-mZ">{props.titleSubmissionCount}</p>
        </div>
        <div id="sponsorTimesContributionsContainer" className={props.isSettingUsername ? " hidden" : ""}>
            <p className="u-mZ cb-grey-text">
                <FormattedText
                    langKey="Thumbnails"
                    titleFormatting={props.titleFormatting}
                />:
            </p>
            <p id="sponsorTimesContributionsDisplay" className="u-mZ">{props.thumbnailSubmissionCount}</p>
        </div>
    </>
}

function getReplacementsMessage(): JSX.Element {
    const messageParts = chrome.i18n.getMessage("dearrowStatsMessage2")
        .split("{titleAndThumbnailMessage}");

    const titleParts = (Config.config!.titleReplacements === 1 ?
        chrome.i18n.getMessage("dearrowStatsMessageTitlePart") :
        chrome.i18n.getMessage("dearrowStatsMessageTitlesPart")).split("{titles}");
    const thumbnailTemplate = (Config.config!.thumbnailReplacements === 1 ?
        chrome.i18n.getMessage("dearrowStatsMessageThumbnailPart") :
        chrome.i18n.getMessage("dearrowStatsMessageThumbnailsPart")).split("{thumbnails}");

    return (
        <p id="dearrowReplacementsDone" className="u-mZ sbStatsSentence">
            {messageParts[0]}
            {titleParts[0]}
            <b>
                {Config.config!.titleReplacements}
            </b>
            {titleParts[1]}

            {thumbnailTemplate[0]}
            <b>
                {Config.config!.thumbnailReplacements}
            </b>
            {thumbnailTemplate[1]}

            {messageParts[1]}
        </p>
    )  
}
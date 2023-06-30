import * as React from "react";
import Config from "../config/config";
import { sendRequestToServer } from "../dataFetching";
import { getHash } from "../maze-utils/hash";
import { getErrorMessage } from "../maze-utils/formating";
import PencilIcon from "../svgIcons/pencilIcon";
import ClipboardIcon from "../svgIcons/clipboardIcon";
import CheckIcon from "../svgIcons/checkIcon";

export const YourWorkComponent = () => {
    const [isSettingUsername, setIsSettingUsername] = React.useState(false);
    const [username, setUsername] = React.useState("");
    const [newUsername, setNewUsername] = React.useState("");
    const [usernameSubmissionStatus, setUsernameSubmissionStatus] = React.useState("");
    const [titleSubmissionCount, setTitleSubmissionCount] = React.useState("");
    const [thumbnailSubmissionCount, setThumbnailSubmissionCount] = React.useState("");

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
        <div className="sbYourWorkBox">
            <h2 className="sbHeader" style={{ "padding": "8px 15px" }}>
            {chrome.i18n.getMessage("yourWork")}
            </h2>
            <div className="sbYourWorkCols">
                {/* Username */}
                <div id="cbUsernameElement">
                    <p className="u-mZ cb-grey-text">{chrome.i18n.getMessage("Username")}:
                        {/* loading/errors */}
                        <span id="setUsernameStatus" 
                            className={`u-mZ cb-white-text${!usernameSubmissionStatus ? " hidden" : ""}`}>
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
                {/* Submissions */}
                <div id="sponsorTimesContributionsContainer" className={isSettingUsername ? " hidden" : ""}>
                    <p className="u-mZ cb-grey-text">{chrome.i18n.getMessage("Titles")}:</p>
                    <p id="sponsorTimesContributionsDisplay" className="u-mZ">{titleSubmissionCount}</p>
                </div>
                <div id="sponsorTimesContributionsContainer" className={isSettingUsername ? " hidden" : ""}>
                    <p className="u-mZ cb-grey-text">{chrome.i18n.getMessage("Thumbnails")}:</p>
                    <p id="sponsorTimesContributionsDisplay" className="u-mZ">{thumbnailSubmissionCount}</p>
                </div>
            </div>
        </div>
    );
};
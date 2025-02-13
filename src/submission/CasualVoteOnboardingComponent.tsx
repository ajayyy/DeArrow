import * as React from "react";
import { FormattedText } from "../popup/FormattedTextComponent";
import { casualWikiLink } from "./casualVote.const";
import { TitleFormatting } from "../config/config";

export interface CasualVoteComponentProps {
    close: () => void;
}

export const CasualVoteOnboardingComponent = (props: CasualVoteComponentProps) => {

    return (
        <div className="casualVoteMenuInner casualOnboarding"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}>

            <div className="cbCasualVoteTitle">
                <FormattedText
                    langKey="newCasualMode"
                />
            </div>

            <div className="cbCasualVoteLogoContainer">
                <img
                    className="cbCasualVoteLogo"
                    src={chrome.runtime.getURL("icons/logo-casual.svg")}
                />
            </div>

            <div className="cbCasualVoteDescription">
                {chrome.i18n.getMessage("CasualModeDescription").split("\n").map((line, index) => (
                    <div key={index}>{line}</div>
                ))}

                <div>
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={casualWikiLink}>
                        <FormattedText
                            langKey="LearnMore"
                            titleFormatting={TitleFormatting.SentenceCase}
                        />
                    </a>
                </div>
            </div>

            <div className="cbVoteButtonContainer">
                <button className="cbNoticeButton cbVoteButton"
                    onClick={() => {
                        chrome.runtime.sendMessage({ "message": "openConfig" });
                        props.close();
                    }}>
                    <FormattedText
                        langKey="OpenSettings"
                    />
                </button>
            </div>

            <div className="cbVoteButtonContainer">
                <button className="cbNoticeButton cbVoteButton"
                    onClick={() => {
                        props.close();
                    }}>
                    <FormattedText
                        langKey="Dismiss"
                    />
                </button>
            </div>
        </div>
    );
};
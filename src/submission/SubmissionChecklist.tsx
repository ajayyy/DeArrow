import * as React from "react";
import { TitleSubmission } from "../titles/titleData";
import { FormattedText } from "../popup/FormattedTextComponent";
import { Tooltip } from "../utils/tooltip";
import Config from "../config/config";

interface SubmissionChecklistProps {
    title: TitleSubmission;
    onSubmit: () => void;
    onCancel: () => void;
}

interface Tip {
    name: string;
    title: () => string;
    subtitle: () => string;
}

let activeTooltip: Tooltip | null = null;

const tips: Tip[] = [{
    name: "sentenceCase",
    title: () => chrome.i18n.getMessage("sentenceCaseTipTitle"),
    subtitle: () => {
        if (chrome.i18n.getUILanguage().startsWith("en")) {
            // Applies to english only
            return "The first word, proper nouns and acronyms are the only words that should be capitalized.";
        } else {
            return "";
        }
    },
}, {
    name: "answeringQuestion",
    title: () => chrome.i18n.getMessage("answeringQuestionTipTitle"),
    subtitle: () => chrome.i18n.getMessage("answeringQuestionTipSubTitle"),
}, {
    name: "noSummaries",
    title: () => chrome.i18n.getMessage("noSummariesTipTitle"),
    subtitle: () => chrome.i18n.getMessage("noSummariesTipSubTitle"),
}, {
    name: "noFactCheck",
    title: () => chrome.i18n.getMessage("noFactCheckTipTitle"),
    subtitle: () => chrome.i18n.getMessage("noFactCheckTipSubTitle"),
}];

export const SubmissionChecklist = (props: SubmissionChecklistProps) => {
    const [completionStatus, setCompletionStatus] = React.useState(tips.map(() => false));

    return (
        <div className="cbSubmissionChecklist">
            <span className="cbTitle cbTitlePreview">
                {props.title.title}
            </span>

            <Tips tips={tips} completionStatus={completionStatus} setCompletionStatus={setCompletionStatus} />

            <div className="cbVoteButtonContainer">
                <button className="cbNoticeButton cbVoteButton" 
                    disabled={!completionStatus.every((complete) => complete)}
                    onClick={props.onSubmit}>
                    <FormattedText
                        langKey="submit"
                    />
                </button>
            </div>

            <div className="cbCheckAllMessage">
                <FormattedText
                    langKey="checkAllToSubmit"
                />
            </div>

            <div className="cbVoteButtonContainer" style={{ marginBottom: "3px" }}>
                <button className="cbNoticeButton cbVoteButton cbCancelButton" 
                    onClick={props.onCancel}>
                    <FormattedText
                        langKey="cancel"
                    />
                </button>
            </div>
        </div>
    );

};

function Tips(props: { tips: Tip[]; completionStatus: boolean[]; setCompletionStatus: (status: boolean[]) => void }): React.ReactElement {
    const result: React.ReactElement[] = [];

    for (let i = 0; i < tips.length; i++) {
        result.push(getTip(tips[i], i, !(props.completionStatus[i - 1] ?? true), props.completionStatus[i], (value) => {
            props.completionStatus[i] = value;

            if (!value) {
                // Hide all future tips
                for (let j = i + 1; j < tips.length; j++) {
                    props.completionStatus[j] = false;
                }
            }

            props.setCompletionStatus([...props.completionStatus]);
        }));
    }

    return (
        <>
            {result}
        </>
    );
}

function getTip(tip: Tip, index: number, hide: boolean, completed: boolean, onChange: (value: boolean) => void): React.ReactElement {
    return (
        <div className={"cbChecklistBox" + (hide ? " cbCheckboxHide" : "")}
                onClick={() => {
                    onChange(!completed);
                }}
                key={index}>
            <div className="cbChecklistCheckboxParent">
                <input type="checkbox"
                    id={tip.name}
                    name={tip.name}
                    checked={completed}
                    disabled={hide}
                />

                <label></label>
                <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
                    <path d="M2 8.36364L6.23077 12L13 2"></path>
                </svg>
            </div>

            <div className="cbChecklistTextBox">
                <div className="cbChecklistBoxTitle">
                    <FormattedText
                        text={tip.title()}
                    />
                </div>

                <div className="cbChecklistBoxSubtitle">
                    {tip.subtitle()}
                </div>
            </div>
        </div>
    );
}

export function confirmGuidelines(title: TitleSubmission | null): Promise<boolean> {
    if (!shouldConfirmGuidelines()) return Promise.resolve(true);
    if (!title) return Promise.resolve(true);

    const element = document.querySelector(".cbVoteButton") as HTMLElement | null;

    if (element) {
        return new Promise((resolve) => {
            if (activeTooltip) activeTooltip.close();

            activeTooltip = new Tooltip({
                referenceNode: element.parentElement!,
                prependElement: element,
                positionRealtive: false,
                containerAbsolute: true,
                topOffset: "-520px",
                bottomOffset: "inherit",
                rightOffset: "0",
                leftOffset: "0",
                displayTriangle: false,
                center: true,
                showGotIt: false,
                buttonsAtBottom: true,
                textBoxMaxHeight: "800px",
                zIndex: 1,
                opacity: 1,
                showLogo: false,
                elements: [
                    <SubmissionChecklist
                        title={title}
                        onSubmit={() => {
                            activeTooltip?.close();

                            Config.config!.lastGuidelinesConfirmation = Date.now();
                            Config.config!.confirmGuidelinesCount = Config.config!.confirmGuidelinesCount + 1;
                            resolve(true);
                        }}
                        onCancel={() => {
                            activeTooltip?.close();
                            resolve(false);
                        }}
                        key={0}
                    />
                ],
                extraClass: "cbChecklistNotce"
            });
        })
    }

    return Promise.resolve(true);
}

export function closeGuidelineChecklist() {
    activeTooltip?.close();
}

function getDaysUntilNextConfirmation(): number {
    switch (Config.config!.confirmGuidelinesCount) {
        case 0:
            return 0;
        case 1:
            return 1;
        case 2:
            return 3;
        default:
            return 7;
    }
}

function shouldConfirmGuidelines(): boolean {
    return Date.now() - Config.config!.lastGuidelinesConfirmation > getDaysUntilNextConfirmation() * 24 * 60 * 60 * 1000;
}
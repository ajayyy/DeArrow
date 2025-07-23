import * as React from "react";
import { CasualVoteInfo } from "../videoBranding/videoBranding";
import { VideoID } from "../../maze-utils/src/video";
import { FormattedText } from "../popup/FormattedTextComponent";
import { casualVoteCategories } from "./casualVote.const";
import { getCurrentPageTitle } from "../../maze-utils/src/elements";

export enum CasualVoteType {
    Like = 1,
    Dislike = 2
}

export interface CasualVoteComponentProps {
    videoID: VideoID;
    existingVotes: CasualVoteInfo[];
    
    submitClicked: (categories: string[], downvote: boolean) => Promise<boolean>;
}

export const CasualVoteComponent = (props: CasualVoteComponentProps) => {
    const voteInfo = React.useRef(new Set<string>());
    const [voteInfoReady, setVoteInfoReady] = React.useState(false);
    const [voteType, setVoteType] = React.useState<CasualVoteType | null>(null);
    const [currentlySubmitting, setCurrentlySubmitting] = React.useState(false);

    return (
        <div className="casualVoteMenuInner"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}>

            <div className="cbCasualVoteTitle">
                <img
                    className="cbCasualVoteTitleLogo"
                    src={chrome.runtime.getURL("icons/logo-casual.svg")}
                />
                <FormattedText
                    langKey="likeOriginalTitle"
                />
            </div>

            <div className="cbCasualVoteOriginalTitle">
                {getCurrentPageTitle() ?? ""}
            </div>

            <YesOrNo voteType={voteType} setVoteType={setVoteType} />

            <Checkboxes
                voteInfo={voteInfo.current}
                show={voteType === CasualVoteType.Like}
                existingVotes={props.existingVotes}
                setVoteInfoReady={setVoteInfoReady}
            />

            <div className="cbVoteButtonContainer">
                <button className="cbNoticeButton cbVoteButton"
                    disabled={currentlySubmitting || voteType === null || (!voteInfoReady && voteType === CasualVoteType.Like)}
                    onClick={() => {
                        if (voteType) {
                            const downvote = voteType === CasualVoteType.Dislike;
                            props.submitClicked(downvote ? [] : [...voteInfo.current], downvote);
    
                            setCurrentlySubmitting(true);
                        }
                    }}>
                    <FormattedText
                        langKey="submit"
                    />
                </button>
            </div>
        </div>
    );
};

interface YesOrNoProps {
    voteType: CasualVoteType | null;
    setVoteType: (v: CasualVoteType | null) => void;
}

function YesOrNo(props: YesOrNoProps): React.ReactElement {
    return (
        <>
            <div className="cbCasualYesOrNo">
                <Checkbox
                    langKey={"Yes"}
                    checked={props.voteType === CasualVoteType.Like}
                    onChange={(checked) => {
                        if (checked) {
                            props.setVoteType(CasualVoteType.Like);
                        } else {
                            props.setVoteType(null);
                        }
                    }}
                    showCheckbox={false}
                />

                <Checkbox
                    langKey={"No"}
                    checked={props.voteType === CasualVoteType.Dislike}
                    onChange={(checked) => {
                        if (checked) {
                            props.setVoteType(CasualVoteType.Dislike);
                        } else {
                            props.setVoteType(null);
                        }
                    }}
                    showCheckbox={false}
                />
            </div>
        </>
    );
}

interface CheckboxesProps {
    voteInfo: Set<string>;
    show: boolean;
    existingVotes: CasualVoteInfo[];
    setVoteInfoReady: (v: boolean) => void;
}

function Checkboxes(props: CheckboxesProps): React.ReactElement {
    const result: React.ReactElement[] = [];

    for (const category of casualVoteCategories) {
        const existingVote = props.existingVotes.find((v) => v.id === category.id);

        result.push(
            <Checkbox
                key={category.id}
                langKey={category.key}
                subtitle={existingVote ? getVotesText(existingVote.count) : undefined}
                onChange={(checked) => {
                    if (checked) {
                        props.voteInfo.add(category.id);
                    } else {
                        props.voteInfo.delete(category.id);
                    }

                    props.setVoteInfoReady(props.voteInfo.size > 0);
                }}
                showCheckbox={true}
            />
        );
    }

    return (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ visibility: props.show ? "visible" : "hidden" }}>
                {result}
            </div>
        </div>
    );
}

function getVotesText(count: number): string {
    const format = count === 1 ? chrome.i18n.getMessage("vote") : chrome.i18n.getMessage("votes");
    return format.replace("{0}", count.toString());
}

interface CheckboxProps {
    langKey: string;
    checked?: boolean;
    onChange: (value: boolean) => void;
    subtitle?: string;
    showCheckbox: boolean;
}

function Checkbox(props: CheckboxProps): React.ReactElement {
    const [checked, setChecked] = React.useState(props.checked ?? false);

    if (props.checked != null && checked !== props.checked) {
        setChecked(props.checked);
    }

    return (
        <div className={"cbChecklistBox " + (props.showCheckbox ? "cbSquare cbNoAnim " : "")}
                onClick={() => {
                    setChecked(!checked);
                    props.onChange(!checked);
                }}
                key={props.langKey}>
            <div className="cbChecklistCheckboxParent">
                <input type="checkbox"
                    id={props.langKey}
                    name={props.langKey}
                    checked={checked}
                    readOnly={true}
                />

                <label></label>
                {
                    props.showCheckbox &&
                    <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
                        <path d="M2 8.36364L6.23077 12L13 2"></path>
                    </svg>
                }
            </div>

            <div className="cbChecklistTextBox">
                <div className="cbChecklistBoxTitle">
                    <FormattedText
                        langKey={props.langKey}
                    />
                </div>

                {props.subtitle && (
                    <div className="cbChecklistBoxSubtitle">
                        {props.subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}
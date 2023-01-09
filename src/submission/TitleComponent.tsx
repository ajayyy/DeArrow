import React = require("react");
import { TitleResult } from "../titles/titleData";

export interface TitleComponentProps {
    submission: TitleResult;
    large: boolean;
    onSelectOrUpdate: (title: string) => void;
}

export const TitleComponent = (props: TitleComponentProps) => {
    const titleRef = React.useRef<HTMLDivElement>(null);

    return (
        <div className={`cbTitle${props.large ? " cbTitleLarge" : ""}`}
                onClick={() => props.onSelectOrUpdate(titleRef.current!.innerText)}>
            <span ref={titleRef}
                contentEditable={true}
                onInput={(e) => {
                    e.stopPropagation();
                    props.onSelectOrUpdate((e.target as HTMLDivElement).innerText);
                }}
                onKeyDown={(e) => e.stopPropagation()}>
                {props.submission.title}
            </span>

            <button className="resetCustomTitle cbButton" 
                title={chrome.i18n.getMessage("__MSG_resetCustomTitle__")}
                onClick={() => {
                    props.onSelectOrUpdate(props.submission.title);
                    titleRef.current!.innerText = props.submission.title;
                }}>
                <img src={chrome.runtime.getURL("icons/refresh.svg")} alt={chrome.i18n.getMessage("resetIcon")} className="resetCustomTitle" />
            </button>
        </div>
    );
};
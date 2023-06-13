import * as React from "react";
import { RenderedTitleSubmission } from "./TitleDrawerComponent";
import ResetIcon from "../svgIcons/resetIcon";

export interface TitleComponentProps {
    submission: RenderedTitleSubmission;
    selected: boolean;
    onSelectOrUpdate: (title: string, oldTitle: string) => void;
    onDeselect: () => void;
}

export const TitleComponent = (props: TitleComponentProps) => {
    const titleRef = React.useRef<HTMLDivElement>(null);
    const title = React.useRef(props.submission.title);
    const [titleChanged, setTitleChanged] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
        if (focused && title.current === "") {
            // Now it has padding added, time to set selection
            setSelectionToEnd(titleRef.current!);
        }
    }, [focused]);

    const showTitleHint = !focused && title.current === "";
    return (
        <div className={`cbTitle${props.selected ? " cbTitleSelected" : ""}`}
                onClick={() => {
                    const title = titleRef.current!.innerText;
                    props.onSelectOrUpdate(title, title);

                    if (document.activeElement !== titleRef.current) {
                        setFocused(true);
                        setSelectionToEnd(titleRef.current!);
                    }
                }}
                onBlur={() => {
                    setFocused(false);
                }}>

            <span className={`cbTitleTextHint ${!showTitleHint ? "cbHiddenTextBox" : ""}`}>
                {chrome.i18n.getMessage("TypeYourOwnTitleHere")}
            </span>

            <span ref={titleRef}
                contentEditable={true}
                className={`cbTitleTextBox ${showTitleHint ? "cbHiddenTextBox" : ""}`}
                style={{
                    paddingRight: title.current === "" ? "0.5em" : "0"
                }}
                onInput={(e) => {
                    e.stopPropagation();

                    const target = e.target as HTMLTextAreaElement;
                    const newTitle = target.innerText;
                    
                    if (newTitle !== title.current) {
                        props.onSelectOrUpdate(newTitle, title.current);
                        title.current = newTitle;
    
                        setTitleChanged(newTitle !== props.submission.title);
                        setFocused(true);
                    }
                }}
                onKeyDown={(e) => {
                    e.stopPropagation()

                    // Prevent newlines
                    if (e.key === "Enter") {
                        e.preventDefault();
                    }
                }}
                onPaste={(e) => {
                    e.preventDefault();

                    const text = e.clipboardData?.getData?.("text/plain")?.replace(/\n/g, " ") ?? "";
                    document.execCommand("insertText", false, text);
                }}
                dangerouslySetInnerHTML={{ __html: props.submission.title }}>
            </span>

            <button className="resetCustomTitle cbButton" 
                title={chrome.i18n.getMessage("resetCustomTitle")}
                onClick={(e) => {
                    e.stopPropagation();

                    props.onSelectOrUpdate(props.submission.title, titleRef.current!.innerText);
                    props.onDeselect();
                    titleRef.current!.innerText = props.submission.title;
                    title.current = props.submission.title;

                    setTitleChanged(false);

                    if (document.activeElement === titleRef.current) {
                        titleRef.current!.blur();
                    }
                }}>
                <ResetIcon
                    style={{ display: props.selected && titleChanged ? "block" : "none" }} 
                    className="resetCustomTitle"
                />
            </button>
        </div>
    );
};

function setSelectionToEnd(element: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    element.focus();
}
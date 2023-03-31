import React = require("react");
import { RenderedTitleSubmission } from "./TitleDrawerComponent";

export interface TitleComponentProps {
    submission: RenderedTitleSubmission;
    large: boolean;
    onSelectOrUpdate: (title: string, oldTitle: string) => void;
}

export const TitleComponent = (props: TitleComponentProps) => {
    const titleRef = React.useRef<HTMLDivElement>(null);
    const title = React.useRef(props.submission.title);
    const [titleChanged, setTitleChanged] = React.useState(false);

    return (
        <div className={`cbTitle${props.large ? " cbTitleLarge" : ""}`}
                onClick={() => props.onSelectOrUpdate(titleRef.current!.innerText, titleRef.current!.innerText)}>
            <span ref={titleRef}
                contentEditable={true}
                onInput={(e) => {
                    e.stopPropagation();

                    const target = e.target as HTMLTextAreaElement;
                    const newTitle = target.innerText;
                    
                    if (newTitle !== title.current) {
                        props.onSelectOrUpdate(newTitle, title.current);
                        title.current = newTitle;
    
                        setTitleChanged(newTitle !== props.submission.title);
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

                    const text = e.clipboardData?.getData("text/plain");
                    document.execCommand("insertText", false, text);
                }}
                dangerouslySetInnerHTML={{ __html: props.submission.title }}>
            </span>

            <button className="resetCustomTitle cbButton" 
                title={chrome.i18n.getMessage("resetCustomTitle")}
                onClick={() => {
                    props.onSelectOrUpdate(props.submission.title, titleRef.current!.innerText);
                    titleRef.current!.innerText = props.submission.title;
                    title.current = props.submission.title;

                    setTitleChanged(false);
                }}>
                <img style={{ display: props.large && titleChanged ? "block" : "none" }} 
                    src={chrome.runtime.getURL("icons/reset.svg")} alt={chrome.i18n.getMessage("resetIcon")} className="resetCustomTitle" />
            </button>
        </div>
    );
};
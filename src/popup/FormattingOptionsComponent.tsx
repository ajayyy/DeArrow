import * as React from "react";
import Config from "../config/config";
import { toFirstLetterUppercase, toLowerCase, toSentenceCase } from "../titles/titleFormatter";
import { SelectOptionComponent } from "./SelectOptionComponent";
import { ToggleOptionComponent } from "./ToggleOptionComponent";

export const FormattingOptionsComponent = () => {
    const [titleFormatting, setTitleFormatting] = React.useState(String(Config.config!.titleFormatting));
    const [shouldCleanEmojis, setShouldCleanEmojis] = React.useState(Config.config!.shouldCleanEmojis);
    const [thumbnailFallback, setThumbnailFallback] = React.useState(String(Config.config!.thumbnailFallback));

    const [sentenceCaseText, setSentenceCaseText] = React.useState(chrome.i18n.getMessage("SentenceCase"));
    const [lowerCaseText, setLowerCaseText] = React.useState(chrome.i18n.getMessage("LowerCase"));
    const [firstLetterUppercaseText, setFirstLetterUppercaseText] = React.useState(chrome.i18n.getMessage("FirstLetterUppercase"));
    React.useEffect(() => {
        (async () => {
            setSentenceCaseText(await toSentenceCase(chrome.i18n.getMessage("SentenceCase"), false));
            setLowerCaseText(await toLowerCase(chrome.i18n.getMessage("LowerCase")));
            setFirstLetterUppercaseText(await toFirstLetterUppercase(chrome.i18n.getMessage("FirstLetterUppercase")));
        })();
    }, []);

    return (
        <>
            {/* Title Reformatting Option */}
            <SelectOptionComponent
                id="titleFormatting"
                style={{
                    paddingTop: "15px"
                }}
                onChange={(value) => {
                    setTitleFormatting(value);
                    Config.config!.titleFormatting = parseInt(value, 10);
                }}
                value={titleFormatting}
                label={chrome.i18n.getMessage("titleFormatting")}
                options={[
                    { value: "-1", label: chrome.i18n.getMessage("Disabled") },
                    { value: "1", label: chrome.i18n.getMessage("TitleCase") },
                    { value: "2", label: sentenceCaseText },
                    { value: "3", label: lowerCaseText },
                    { value: "4", label: firstLetterUppercaseText },
                    { value: "0", label: chrome.i18n.getMessage("CapitalizeWords") },
                ]}
            />

            {/* Should Clean Emojis */}
            <ToggleOptionComponent
                id="shouldCleanEmojis"
                style={{
                    paddingTop: "15px"
                }}
                onChange={(value) => {
                    setShouldCleanEmojis(value);
                    Config.config!.shouldCleanEmojis = value;
                }}
                value={shouldCleanEmojis}
                label={chrome.i18n.getMessage("shouldCleanEmojis")}
            />

            {/* Thumbnail Fallback Option */}
            <SelectOptionComponent
                id="thumbnailFallback"
                style={{
                    paddingTop: "15px"
                }}
                onChange={(value) => {
                    setThumbnailFallback(value);
                    Config.config!.thumbnailFallback = parseInt(value, 10);
                }}
                value={thumbnailFallback}
                label={chrome.i18n.getMessage("thumbnailFallbackOption")}
                options={[
                    { value: "0", label: chrome.i18n.getMessage("RandomTime") },
                    { value: "1", label: chrome.i18n.getMessage("showABlankBox") },
                    { value: "2", label: chrome.i18n.getMessage("TheOriginalThumbnail") },
                ]}
            />
        </>
    );
};
import * as React from "react";
import Config from "../config/config";
import { toSentenceCase } from "../titles/titleFormatter";
import { SelectOptionComponent } from "./SelectOptionComponent";

export const FormattingOptionsComponent = () => {
    const [titleFormatting, setTitleFormatting] = React.useState(String(Config.config!.titleFormatting));
    const [thumbnailFallback, setThumbnailFallback] = React.useState(String(Config.config!.thumbnailFallback));

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
                    { value: "2", label: toSentenceCase(chrome.i18n.getMessage("SentenceCase"), false) },
                    { value: "3", label: chrome.i18n.getMessage("LowerCase") },
                    { value: "0", label: chrome.i18n.getMessage("CapitalizeWords") },
                ]}
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
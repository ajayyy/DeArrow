import * as React from "react";
import { formatTitleInternal } from "../titles/titleFormatter";
import Config, { TitleFormatting } from "../config/config";

type FormattedTextProps = {
    titleFormatting?: TitleFormatting;
    langKey: string;
} | {
    titleFormatting?: TitleFormatting;
    text: string;
};

export const FormattedText = (props: FormattedTextProps) => {
    const text = "text" in props ? props.text : chrome.i18n.getMessage(props.langKey);
    const [label, setLabel] = React.useState(text);

    React.useEffect(() => {
        if (props.titleFormatting || Config.config!.titleFormatting) {
            (async () => {
                const text = "text" in props ? props.text : chrome.i18n.getMessage(props.langKey);

                setLabel(await formatTitleInternal(text, false, props.titleFormatting ?? Config.config!.titleFormatting, false));
            })();
        }
    }, ["text" in props ? props.text : props.langKey, props.titleFormatting!]);

    return (
        <>
            {label}
        </>
    );
};
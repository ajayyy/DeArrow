import * as React from "react";
import { TitleFormatting, formatTitle } from "../../maze-utils/src/titleFormatter";
import Config from "../config/config";

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
        if (props.titleFormatting) {
            (async () => {
                const text = "text" in props ? props.text : chrome.i18n.getMessage(props.langKey);

                setLabel(await formatTitle(text, false, props.titleFormatting!, false, Config.config!.onlyTitleCaseInEnglish));
            })();
        }
    }, ["text" in props ? props.text : props.langKey, props.titleFormatting!]);

    return (
        <>
            {label}
        </>
    );
};

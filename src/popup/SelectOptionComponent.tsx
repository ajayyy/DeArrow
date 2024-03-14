import * as React from "react";
import ResetIcon from "../svgIcons/resetIcon";
import { TitleFormatting } from "../config/config";
import { formatTitleInternal } from "../titles/titleFormatter";
import { FormattedText } from "./FormattedTextComponent";

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectOptionComponentProps {
    id: string;
    onChange: (value: string) => void;
    value: string;
    label?: string;
    options: SelectOption[];
    style?: React.CSSProperties;
    className?: string;
    showResetButton?: boolean;
    onReset?: () => void;
    titleFormatting?: TitleFormatting;
    applyFormattingToOptions?: boolean;
}

export const SelectOptionComponent = (props: SelectOptionComponentProps) => {
    const [options, setOptions] = React.useState(props.options);

    React.useEffect(() => {
        if (props.applyFormattingToOptions) {
            (async () => {
                const formattedOptions = await Promise.all(props.options.map(async (option) => {
                    return {
                        value: option.value,
                        label: await formatTitleInternal(option.label, false, props.titleFormatting!, false)
                    };
                }));

                setOptions(formattedOptions);
            })();
        } else {
            setOptions(props.options);
        }
    }, [props.options, props.applyFormattingToOptions, props.titleFormatting!]);

    return (
        <div className={`sb-optionContainer ${props.className ?? ""}`} style={props.style}>
            {
                props.label &&
                    <label className="sb-optionLabel" htmlFor={props.id}>
                        <FormattedText text={props.label} titleFormatting={props.titleFormatting}/>
                    </label>
            }
            <select id={props.id}
                className="sb-selector-element sb-optionsSelector"
                value={props.value}
                onChange={(e) => {
                    props.onChange(e.target.value);
                }}>
                {getOptions(options)}
            </select>

            {
                props.showResetButton &&
                <div className="reset-button" onClick={() => {
                    props.onReset?.();
                }}>
                    <ResetIcon/>
                </div>
            }
        </div>
    );
};

function getOptions(options: SelectOption[]): React.ReactNode[] {
    return options.map((option) => {
        return (
            <option value={option.value} key={option.value}>{option.label}</option>
        );
    });
}
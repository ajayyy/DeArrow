import * as React from "react";

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectOptionComponentProps {
    id: string;
    onChange: (value: string) => void;
    value: string;
    label: string;
    options: SelectOption[];
    style?: React.CSSProperties;
}

export const SelectOptionComponent = (props: SelectOptionComponentProps) => {
    return (
        <div className="optionContainer" style={props.style}>
            <label className="optionLabel" htmlFor={props.id}>{props.label}</label>
            <select id={props.id}
                className="selector-element optionsSelector"
                value={props.value}
                onChange={(e) => {
                    props.onChange(e.target.value);
                }}>
                {getOptions(props.options)}
            </select>
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
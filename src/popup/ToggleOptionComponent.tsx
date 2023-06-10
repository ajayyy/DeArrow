import * as React from "react";

export interface SelectOption {
    value: string;
    label: string;
}

export interface ToggleOptionComponentProps {
    id: string;
    onChange: (value: boolean) => void;
    value: boolean;
    label: string;
    style?: React.CSSProperties;
}

export const ToggleOptionComponent = (props: ToggleOptionComponentProps) => {
    return (
        <div className="switch-container-container" style={props.style}>
            <div className="switch-container animated">
                <label className="switch">
                    <input id={props.id} 
                        type="checkbox" 
                        checked={props.value}
                        onClick={(e) => {
                            props.onChange((e.target as HTMLInputElement).checked);
                        }}/>
                    <span className="slider round"></span>
                </label>
                <label className="switch-label" htmlFor={props.id}>
                    {props.label}
                </label>
            </div>
        </div>
    );
};
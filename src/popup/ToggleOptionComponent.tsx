import * as React from "react";
import ResetIcon from "../svgIcons/resetIcon";

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
    className?: string;
    showResetButton?: boolean;
    onReset?: () => void;
}

export const ToggleOptionComponent = (props: ToggleOptionComponentProps) => {
    return (
        <div className={`switch-container-container ${props.className ?? ""}`} style={props.style}>
            <div className="switch-container animated">
                <label className="switch">
                    <input id={props.id} 
                        type="checkbox" 
                        checked={props.value}
                        onChange={(e) => {
                            props.onChange((e.target as HTMLInputElement).checked);
                        }}/>
                    <span className="slider round"></span>
                </label>
                <label className="switch-label" htmlFor={props.id}>
                    {props.label}
                </label>

                {
                    props.showResetButton &&
                        <div className="reset-button switch-label" onClick={() => {
                            props.onReset?.();
                        }}>
                            <ResetIcon/>
                        </div>
                }
            </div>
        </div>
    );
};
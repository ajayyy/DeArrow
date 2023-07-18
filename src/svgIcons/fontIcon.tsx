import * as React from "react";

export interface FontIconProps {
  id?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const FontIcon = ({
  id = "",
  className = "",
  style = {},
  onClick
}: FontIconProps): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    className={className}
    style={style}
    id={id}
    onClick={onClick} >
    <path d="M290-160v-540H80v-100h520v100H390v540H290Zm360 0v-340H520v-100h360v100H750v340H650Z"/>
  </svg>
);

export default FontIcon;
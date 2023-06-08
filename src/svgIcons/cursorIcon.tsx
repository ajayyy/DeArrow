import * as React from "react";

export interface CursorIconProps {
  id?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const CursorIcon = ({
  id = "",
  className = "",
  style = {},
  onClick
}: CursorIconProps): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    className={className}
    style={style}
    id={id}
    onClick={onClick} >
    <path d="M560-84 412-401 240-160v-720l560 440H505l145 314-90 42Z"/>
  </svg>
);

export default CursorIcon;
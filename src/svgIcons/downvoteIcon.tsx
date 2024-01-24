import * as React from "react";

export interface DownvoteIconProps {
  locked?: boolean;
  className?: string;
  width?: string;
  height?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const DownvoteIcon = ({
  locked = false,
  className = "",
  width = "16",
  height = "16",
  style = {},
  onClick
}: DownvoteIconProps): JSX.Element => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24"
    height={width}
    width={height}
    className={className}
    style={style}
    onClick={onClick} >
      <path
        d="M0 0h24v24H0z"
        fill="none"
        id="path2" />
      <path
        d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"
        id="path4"
        style={{ fill: locked ? "#ffc83d" : "#ffffff" }} />
  </svg>
);

export default DownvoteIcon;
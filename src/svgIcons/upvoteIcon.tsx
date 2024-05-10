import * as React from "react";

export interface UpvoteIconProps {
  selected?: boolean;
  fill?: string;
  className?: string;
  width?: string;
  height?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const UpvoteIcon = ({
  selected = false,
  className = "",
  width = "16",
  height = "16",
  style = {},
  onClick
}: UpvoteIconProps): JSX.Element => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24"
    height={width}
    width={height}
    className={className}
    style={style}
    onClick={onClick} >
      <path
      d="M0 0h24v24H0V0z"
      fill="none"
      id="path2" />
      <path
        d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
        id="path4" 
        style={{ fill: selected ? "#0a62a5" : undefined }} />
  </svg>
);

export default UpvoteIcon;
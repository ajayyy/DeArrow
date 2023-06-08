import * as React from "react";

export interface ExclamationIconProps {
  id?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const ExclamationIcon = ({
  id = "",
  className = "",
  style = {},
  onClick
}: ExclamationIconProps): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    className={className}
    style={style}
    id={id}
    onClick={onClick} >
    <path d="M479.911-120Q451-120 430.5-140.589q-20.5-20.588-20.5-49.5Q410-219 430.589-239.5q20.588-20.5 49.5-20.5Q509-260 529.5-239.411q20.5 20.588 20.5 49.5Q550-161 529.411-140.5q-20.588 20.5-49.5 20.5ZM410-360v-480h140v480H410Z"/>
  </svg>
);

export default ExclamationIcon;
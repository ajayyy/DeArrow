import * as React from "react";

export interface PersonIconProps {
  id?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const PersonIcon = ({
  id = "",
  className = "",
  style = {},
  onClick
}: PersonIconProps): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    className={className}
    style={style}
    id={id}
    onClick={onClick} >
    <path d="M480-481q-66 0-108-42t-42-108q0-66 42-108t108-42q66 0 108 42t42 108q0 66-42 108t-108 42ZM160-160v-94q0-38 19-65t49-41q67-30 128.5-45T480-420q62 0 123 15.5T731-360q31 14 50 41t19 65v94H160Z"/>
  </svg>
);

export default PersonIcon;
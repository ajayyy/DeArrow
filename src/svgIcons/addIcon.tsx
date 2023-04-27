import * as React from "react";

export interface AddIconProps {
  fill?: string;
  className?: string;
  width?: string;
  height?: string;
  onClick?: () => void;
}

const AddIcon = ({
  fill = "#ffffff",
  className = "",
  width = "20",
  height = "20",
  onClick
}: AddIconProps): JSX.Element => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 96 960 960"
    height={width}
    width={height}
    className={className}
    fill={fill}
    onClick={onClick} >
    <path 
        d="M453 776h60V610h167v-60H513V376h-60v174H280v60h173v166Zm27.266 200q-82.734 0-155.5-31.5t-127.266-86q-54.5-54.5-86-127.341Q80 658.319 80 575.5q0-82.819 31.5-155.659Q143 347 197.5 293t127.341-85.5Q397.681 176 480.5 176q82.819 0 155.659 31.5Q709 239 763 293t85.5 127Q880 493 880 575.734q0 82.734-31.5 155.5T763 858.316q-54 54.316-127 86Q563 976 480.266 976Zm.234-60Q622 916 721 816.5t99-241Q820 434 721.188 335 622.375 236 480 236q-141 0-240.5 98.812Q140 433.625 140 576q0 141 99.5 240.5t241 99.5Zm-.5-340Z"/>
  </svg>
);

export default AddIcon;
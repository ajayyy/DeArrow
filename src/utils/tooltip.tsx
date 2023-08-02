import { GenericTooltip, TooltipProps } from "../../maze-utils/src/components/Tooltip";

export class Tooltip extends GenericTooltip {
    constructor(props: TooltipProps) {
        super(props, "icons/logo.svg")
    }
}
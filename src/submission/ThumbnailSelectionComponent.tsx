import * as React from "react";
import { getFormattedTime } from "@ajayyy/maze-utils/lib/formating";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { ThumbnailComponent, ThumbnailType } from "./ThumbnailComponent";
import AddIcon from "../svgIcons/addIcon";

export interface ThumbnailSelectionComponentProps {
    video: HTMLVideoElement;
    selected: boolean;
    onClick: (thumbnail: ThumbnailSubmission) => void;
    type: ThumbnailType;
    videoID: VideoID;
    time?: number;
    firstElem: boolean;
    lastElem: boolean;
}

/**
 * The selector object for choosing a thumbnail
 */
export const ThumbnailSelectionComponent = (props: ThumbnailSelectionComponentProps) => {
    const [error, setError] = React.useState("")

    return (
        <ThumbnailComponent
                video={props.video}
                selected={props.selected}
                type={props.type}
                videoID={props.videoID}
                time={props.time}
                firstElem={props.firstElem}
                lastElem={props.lastElem}
                onError={(e) => setError(e)}
                onClick={props.onClick}>

            {
                props.type === ThumbnailType.CurrentTime ?
                    <div className="cbAddThumbnailOverlay">
                        <AddIcon
                            width="60%"
                            height="60%"
                        />
                    </div> : null
            }
            <div style={{ fontWeight: "bold", textAlign: "center", marginTop: "4px" }}>
                {error ? <div>{error}</div> : null}
                {getText(props.time, props.type)}
            </div>
        </ThumbnailComponent>
    );
};

function getText(time: number | undefined, type: ThumbnailType) {
    if (type === ThumbnailType.Original) {
        return chrome.i18n.getMessage("Original");
    } else if (type === ThumbnailType.CurrentTime) {
        return chrome.i18n.getMessage("CurrentTime");
    } else if (time != null) {
        return getFormattedTime(time);
    } else {
        return "";
    }
}
import * as React from "react";
import { getFormattedTime } from "../../maze-utils/src/formating";
import { VideoID } from "../../maze-utils/src/video";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { ThumbnailComponent, ThumbnailType } from "./ThumbnailComponent";
import AddIcon from "../svgIcons/addIcon";
import UpvoteIcon from "../svgIcons/upvoteIcon";
import DownvoteIcon from "../svgIcons/downvoteIcon";
import { submitVideoBrandingAndHandleErrors } from "../dataFetching";
import { AnimationUtils } from "../../maze-utils/src/animationUtils";

export interface ThumbnailSelectionComponentProps {
    video: HTMLVideoElement;
    selected?: boolean;
    onClick?: (thumbnail: ThumbnailSubmission) => void;
    type: ThumbnailType;
    videoID: VideoID;
    hideTime?: boolean;
    time?: number;
    larger?: boolean;
    votable?: boolean;
    submission?: ThumbnailSubmission;
}

/**
 * The selector object for choosing a thumbnail
 */
export const ThumbnailSelectionComponent = (props: ThumbnailSelectionComponentProps) => {
    const [error, setError] = React.useState("");

    function createThumbnailSubmission(): ThumbnailSubmission | null {
        return props.type === ThumbnailType.Original ? {
            original: true
        } : {
            original: false,
            timestamp: props.time!
        };
    }

    return (
        <ThumbnailComponent
                video={props.video}
                selected={props.selected}
                type={props.type}
                videoID={props.videoID}
                time={props.time}
                larger={props.larger}
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
            {
                !props.hideTime && props.type !== ThumbnailType.CurrentTime ?
                <>
                    <div style={{ fontWeight: "bold", textAlign: "center", marginTop: "4px" }}>
                        {error ? <div>{error}</div> : null}
                        {getText(props.time, props.type)}
                    </div>

                    <div className="cbVoteButtons"
                            style={{ visibility: !props.selected && props.votable ? undefined : "hidden" }}>
                        <button className="cbButton" 
                            title={chrome.i18n.getMessage("upvote")}
                            onClick={(e) => {
                                e.stopPropagation();

                                const stopAnimation = AnimationUtils.applyLoadingAnimation(e.currentTarget, 0.3);
                                submitVideoBrandingAndHandleErrors(null, createThumbnailSubmission(), false).then(stopAnimation);
                            }}>
                            <UpvoteIcon/>
                        </button>

                        <button className="cbButton" 
                            title={chrome.i18n.getMessage("downvote")}
                            onClick={(e) => {
                                e.stopPropagation();

                                const stopAnimation = AnimationUtils.applyLoadingAnimation(e.currentTarget, 0.3);
                                submitVideoBrandingAndHandleErrors(null, createThumbnailSubmission(), true).then(stopAnimation);
                            }}>
                            <DownvoteIcon/>
                        </button>
                    </div>
                </>
                : null
            }


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
import React = require("react");
import { ThumbnailType } from "./ThumbnailComponent";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { ThumbnailSelectionComponent } from "./ThumbnailSelectionComponent";

export interface ThumbnailDrawerComponentProps {
    video: HTMLVideoElement;
    videoId: VideoID;
    existingSubmissions: RenderedThumbnailSubmission[];
    selectedThumbnailIndex: number;
    onSelect: (submission: ThumbnailSubmission, index: number) => void;
}

interface NoTimeRenderedThumbnailSubmission {
    type: ThumbnailType.CurrentTime | ThumbnailType.Original;
}

interface TimeRenderedThumbnailSubmission {
    timestamp: number;
    type: ThumbnailType.SpecifiedTime;
}

export type RenderedThumbnailSubmission = (NoTimeRenderedThumbnailSubmission | TimeRenderedThumbnailSubmission);

export const ThumbnailDrawerComponent = (props: ThumbnailDrawerComponentProps) => {
    return (
        <>
            {getThumbnails(props, props.selectedThumbnailIndex)}
        </>
    );
};

function getThumbnails(props: ThumbnailDrawerComponentProps, 
        selectedThumbnail: number): JSX.Element[] {
    const thumbnails: JSX.Element[] = [];
    const renderCount = props.existingSubmissions.length;
    for (let i = 0; i < renderCount; i++) {
        const time = props.existingSubmissions[i].type === ThumbnailType.SpecifiedTime ? 
            (props.existingSubmissions[i] as TimeRenderedThumbnailSubmission).timestamp : undefined;

        thumbnails.push(
            <ThumbnailSelectionComponent
                video={props.video}
                selected={selectedThumbnail === i}
                onClick={(submission) => {
                    props.onSelect(submission, i);
                }}
                type={props.existingSubmissions[i].type}
                videoID={props.videoId}
                time={time}
                firstElem={i === 0}
                lastElem={i === renderCount - 1}
                key={time ? `T${time}` : `I${i}`}
            ></ThumbnailSelectionComponent>
        );
    }

    return thumbnails;
}
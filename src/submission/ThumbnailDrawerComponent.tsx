import React = require("react");
import { ThumbnailComponent } from "./ThumbnailComponent";
import { ThumbnailType } from "./ThumbnailComponent";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";

export interface ThumbnailDrawerComponentProps {
    video: HTMLVideoElement;
    videoId: VideoID;
    existingSubmissions: RenderedThumbnailSubmission[];
    selectedThumbnailIndex: number;
    onSelect: (submission: ThumbnailSubmission, oldTime: number | undefined, index: number) => void;
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
    const renderCount = Math.min(5, props.existingSubmissions.length);
    for (let i = 0; i < renderCount; i++) {
        thumbnails.push(
            <ThumbnailComponent
                video={props.video}
                large={selectedThumbnail === i}
                onClick={(submission, oldTime) => {
                    props.onSelect(submission, oldTime, i);
                }}
                type={props.existingSubmissions[i].type}
                videoID={props.videoId}
                time={props.existingSubmissions[i].type === ThumbnailType.SpecifiedTime ? 
                    (props.existingSubmissions[i] as TimeRenderedThumbnailSubmission).timestamp : undefined}
                firstElem={i === 0}
                lastElem={i === renderCount - 1}
                key={i}
            ></ThumbnailComponent>
        );
    }

    return thumbnails;
}
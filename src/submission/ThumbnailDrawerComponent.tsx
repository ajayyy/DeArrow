import * as React from "react";
import { ThumbnailType } from "./ThumbnailComponent";
import { VideoID } from "../../maze-utils/src/video";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { ThumbnailSelectionComponent } from "./ThumbnailSelectionComponent";

export interface ThumbnailDrawerComponentProps {
    video: HTMLVideoElement;
    videoId: VideoID;
    existingSubmissions: RenderedThumbnailSubmission[];
    selectedThumbnailIndex: number;
    onSelect: (submission: ThumbnailSubmission, index: number) => void;
    actAsVip: boolean;
}

interface NoTimeRenderedThumbnailSubmission {
    type: ThumbnailType.CurrentTime | ThumbnailType.Original;
}

interface TimeRenderedThumbnailSubmission {
    timestamp: number;
    type: ThumbnailType.SpecifiedTime;
}

export type RenderedThumbnailSubmission = (NoTimeRenderedThumbnailSubmission | TimeRenderedThumbnailSubmission) & {
    votable: boolean;
    locked: boolean;
};

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
                votable={props.existingSubmissions[i].votable}
                locked={props.existingSubmissions[i].locked}
                actAsVip={props.actAsVip}
                key={time ? `T${time}` : `I${i}`}
            ></ThumbnailSelectionComponent>
        );
    }

    return thumbnails;
}
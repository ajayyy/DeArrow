import React = require("react");
import { VideoID } from "../videoBranding/videoBranding";
import { ThumbnailComponent } from "./ThumbnailComponent";
import { ThumbnailType } from "./ThumbnailComponent";

export interface ThumbnailDrawerComponentProps {
    video: HTMLVideoElement;
    videoId: VideoID;
    existingSubmissions: RenderedThumbnailSubmission[];
    onSelect: (submission: RenderedThumbnailSubmission) => void;
}

type NoTimeRenderedThumbnailSubmission = {
    type: ThumbnailType.CurrentTime | ThumbnailType.Original;
}

interface TimeRenderedThumbnailSubmission {
    timestamp: number;
    type: ThumbnailType.SpecifiedTime;
}

export type RenderedThumbnailSubmission = NoTimeRenderedThumbnailSubmission | TimeRenderedThumbnailSubmission;

export const ThumbnailDrawerComponent = (props: ThumbnailDrawerComponentProps) => {
    const [selectedThumbnail, setSelectedThumbnail] = React.useState(0);
    
    return (
        <>
            {getThumbnails(props, selectedThumbnail, setSelectedThumbnail)}
        </>
    );
};

function getThumbnails(props: ThumbnailDrawerComponentProps, 
        selectedThumbnail: number, setSelectedThumbnail: (val: number) => void): JSX.Element[] {
    const thumbnails: JSX.Element[] = [];
    const renderCount = Math.max(5, props.existingSubmissions.length);
    for (let i = 0; i < renderCount; i++) {
        thumbnails.push(
            <ThumbnailComponent
                video={props.video}
                large={selectedThumbnail === i}
                onClick={() => {
                    setSelectedThumbnail(i);
                    props.onSelect(props.existingSubmissions[i]);
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
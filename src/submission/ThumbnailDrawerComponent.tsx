import React = require("react");
import { ThumbnailResult } from "../thumbnails/thumbnailData";
import { VideoID } from "../videoBranding/videoBranding";
import { ThumbnailComponent } from "./ThumbnailComponent";
import { ThumbnailType } from "./ThumbnailComponent";

export interface ThumbnailDrawerComponentProps {
    video: HTMLVideoElement;
    videoId: VideoID;
    existingSubmissions: ThumbnailResult[];
}

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
    const renderCount = 4;
    for (let i = 0; i < renderCount; i++) {
        thumbnails.push(
            <ThumbnailComponent
                video={props.video}
                large={selectedThumbnail === i}
                onClick={() => setSelectedThumbnail(i)}
                type={i === 0 ? ThumbnailType.OfficialImage : i === 1 ? ThumbnailType.CurrentTime : ThumbnailType.SpecifiedTime}
                videoID={props.videoId}
                time={i > 1 ? props.existingSubmissions[i - 2].timestamp : undefined}
                firstElem={i === 0}
                lastElem={i === renderCount - 1}
                key={i}
            ></ThumbnailComponent>
        );
    }

    return thumbnails;
}
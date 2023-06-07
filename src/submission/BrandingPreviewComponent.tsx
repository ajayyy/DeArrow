import * as React from "react";
import { RenderedTitleSubmission } from "./TitleDrawerComponent";
import { RenderedThumbnailSubmission } from "./ThumbnailDrawerComponent";
import { BrandingResult } from "../videoBranding/videoBranding";
import { ThumbnailType } from "./ThumbnailComponent";
import { ThumbnailSelectionComponent } from "./ThumbnailSelectionComponent";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { formatTitle } from "../titles/titleFormatter";

export interface BrandingPreviewComponentComponentProps {
    submissions: BrandingResult;
    titles: RenderedTitleSubmission[];
    thumbnails: RenderedThumbnailSubmission[];
    selectedTitle: RenderedTitleSubmission | null;
    selectedThumbnail: RenderedThumbnailSubmission | null;

    video: HTMLVideoElement;
    videoID: VideoID;
    children?: React.ReactNode;
}

export const  BrandingPreviewComponent = (props: BrandingPreviewComponentComponentProps) => {
    const [displayedTitle, setDisplayedTitle] = React.useState(getDefaultTitle(props.submissions, props.titles));
    const [displayedThumbnail, setDisplayedThumbnail] = React.useState(getDefaultThumbnail(props.submissions, props.thumbnails));

    React.useEffect(() => {
        if (props.selectedTitle?.title) {
            setDisplayedTitle(props.selectedTitle);
        } else {
            setDisplayedTitle(getDefaultTitle(props.submissions, props.titles));
        }
    }, [props.selectedTitle]);

    React.useEffect(() => {
        if (props.selectedThumbnail) {
            setDisplayedThumbnail(props.selectedThumbnail);
        } else {
            setDisplayedThumbnail(getDefaultThumbnail(props.submissions, props.thumbnails));
        }
    }, [props.selectedThumbnail]);

    return (
        <div className="cbBrandingPreview">
            <ThumbnailSelectionComponent
                video={props.video}
                type={displayedThumbnail.type}
                videoID={props.videoID}
                time={displayedThumbnail.type === ThumbnailType.SpecifiedTime ? displayedThumbnail.timestamp : undefined}
                hideTime={true}
            ></ThumbnailSelectionComponent>

            <div className="cbTitle cbTitlePreview">
                {formatTitle(displayedTitle.title, true)}
            </div>
        </div>
    );
};

function getDefaultTitle(submissions: BrandingResult, titles: RenderedTitleSubmission[]): RenderedTitleSubmission {
    if (submissions.titles.some((t) => t.votes >= 0)) {
        const bestTitle = submissions.titles.sort((a, b) => b.votes - a.votes)
            .sort((a, b) => +b.locked - +a.locked)[0];

        return titles.find((t) => t.title === bestTitle?.title) ?? titles[0];
    } else {
        return titles[0];
    }
}

function getDefaultThumbnail(submissions: BrandingResult, thumbnails: RenderedThumbnailSubmission[]): RenderedThumbnailSubmission {
    if (submissions.thumbnails.some((t) => t.votes >= 0)) {
        const best = submissions.thumbnails.sort((a, b) => b.votes - a.votes)
            .sort((a, b) => +b.locked - +a.locked)[0];

        if (!best.original) {
            return thumbnails.find((t) => t.type === ThumbnailType.SpecifiedTime
                && t.timestamp === best.timestamp) ?? thumbnails[0];
        } else {
            return thumbnails[0];
        }
    } else {
        return thumbnails[0];
    }
}
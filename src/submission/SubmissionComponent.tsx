import React = require("react");
import { CustomThumbnailResult } from "../thumbnails/thumbnailData";
import { getCurrentPageTitle } from "../titles/titleData";
import { BrandingResult } from "../videoBranding/videoBranding";
import { ThumbnailType } from "./ThumbnailComponent";
import { RenderedThumbnailSubmission, ThumbnailDrawerComponent } from "./ThumbnailDrawerComponent";
import { RenderedTitleSubmission, TitleDrawerComponent } from "./TitleDrawerComponent";
import { VideoID } from "@ajayyy/maze-utils/lib/video";

export interface SubmissionComponentProps {
    videoID: VideoID;
    video: HTMLVideoElement;
    submissions: BrandingResult;
}

export const SubmissionComponent = (props: SubmissionComponentProps) => {
    const originalTitle = getCurrentPageTitle() || chrome.i18n.getMessage("OriginalTitle");
    const titles: RenderedTitleSubmission[] = [{
        title: originalTitle
    }, {
        title: chrome.i18n.getMessage("TypeYourOwnTitleHere")
    }, ...props.submissions.titles
    .filter((s) => s.title !== originalTitle)
    .map((s) => ({
        title: s.title
    }))];


    const thumbnails: RenderedThumbnailSubmission[] = [{
        type: ThumbnailType.Original
    }, {
        type: ThumbnailType.CurrentTime
    }, ...props.submissions.thumbnails
    .filter((s) => !s.original)
    .map((s: CustomThumbnailResult) => ({
        timestamp: s.timestamp,
        type: ThumbnailType.SpecifiedTime
    }))];

    const selectedTitle = React.useRef(titles[0]);
    const selectedThumbnail = React.useRef(thumbnails[0]);

    return (
        <div className="submissionMenuInner">
            <div style={{ display: "flex" }}>
                <ThumbnailDrawerComponent 
                    video={props.video} 
                    videoId={props.videoID} 
                    existingSubmissions={thumbnails}
                    onSelect={(t) => selectedThumbnail.current = t}></ThumbnailDrawerComponent>
            </div>

            <div>
                <TitleDrawerComponent existingSubmissions={titles} 
                    onSelectOrUpdate={(t) => selectedTitle.current = t}></TitleDrawerComponent>
            </div>

            <hr className="cbLine">
            </hr>

            <div className="cbSubmitInstructions">
                {chrome.i18n.getMessage("chooseDescriptive")}
            </div>

            <button className="cbNoticeButton cbVoteButton">
                {`${chrome.i18n.getMessage("Vote")}!`}
            </button>
        </div>
    );
};
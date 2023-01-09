import React = require("react");
import { BrandingResult, VideoID } from "../videoBranding/videoBranding";
import { ThumbnailDrawerComponent } from "./ThumbnailDrawerComponent";
import { TitleDrawerComponent } from "./TitleDrawerComponent";

export interface SubmissionComponentProps {
    videoID: VideoID;
    video: HTMLVideoElement;
    submissions: BrandingResult;
}

export const SubmissionComponent = (props: SubmissionComponentProps) => {
    const [selectedTitle, setSelectedTitle] = React.useState(props.submissions.titles[0]);

    return (
        <div className="submissionMenuInner">
            {/* No original, since that's handled internally */}
            <div style={{ display: "flex" }}>
                <ThumbnailDrawerComponent video={props.video} videoId={props.videoID} existingSubmissions={props.submissions.thumbnails.filter((s) => !s.original)}></ThumbnailDrawerComponent>
            </div>

            <div>
                <TitleDrawerComponent existingSubmissions={props.submissions.titles} 
                    onSelectOrUpdate={(t) => setSelectedTitle(t)}></TitleDrawerComponent>
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
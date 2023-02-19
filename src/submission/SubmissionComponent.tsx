import React = require("react");
import { CustomThumbnailResult, ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { getCurrentPageTitle, TitleSubmission } from "../titles/titleData";
import { BrandingResult } from "../videoBranding/videoBranding";
import { ThumbnailType } from "./ThumbnailComponent";
import { RenderedThumbnailSubmission, ThumbnailDrawerComponent } from "./ThumbnailDrawerComponent";
import { RenderedTitleSubmission, TitleDrawerComponent } from "./TitleDrawerComponent";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import Config from "../config";

export interface SubmissionComponentProps {
    videoID: VideoID;
    video: HTMLVideoElement;
    submissions: BrandingResult;
    
    submitClicked: (title: TitleSubmission, thumbnail: ThumbnailSubmission) => void;
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
    const selectedThumbnail = React.useRef<ThumbnailSubmission>({
        original: true
    });

    // Load existing unsubmitted thumbnails whenever a videoID change happens
    const [extraUnsubmittedThumbnails, setExtraUnsubmittedThumbnails] = React.useState<RenderedThumbnailSubmission[]>([]);
    const [extraUnsubmittedTitles, setExtraUnsubmittedTitles] = React.useState<RenderedTitleSubmission[]>([]);
    React.useEffect(() => {
        selectedTitle.current = titles[0];
        selectedThumbnail.current = {
            original: true
        };

        const unsubmitted = Config.local!.unsubmitted[props.videoID];
        if (unsubmitted) {
            const unsubmittedThumbnails = unsubmitted.thumbnails;
            if (unsubmittedThumbnails) {
                setExtraUnsubmittedThumbnails(unsubmittedThumbnails
                    .filter((t) => thumbnails.every((s) => !t.original && (s.type !== ThumbnailType.SpecifiedTime
                        || s.timestamp !== t.timestamp)))
                    .map((t) => ({
                    type: ThumbnailType.SpecifiedTime,
                    timestamp: (t as CustomThumbnailResult).timestamp
                })));
            }

            const unsubmittedTitles = unsubmitted.titles;
            if (unsubmittedTitles) {
                setExtraUnsubmittedTitles(unsubmittedTitles
                    .filter((t) => titles.every((s) => s.title !== t.title)));
            }

            Config.forceLocalUpdate("unsubmitted");
        } else {
            setExtraUnsubmittedThumbnails([]);
            setExtraUnsubmittedTitles([]);
        }
    }, [props.videoID]);

    return (
        <div className="submissionMenuInner">
            <div style={{ display: "flex" }}>
                <ThumbnailDrawerComponent 
                    video={props.video} 
                    videoId={props.videoID} 
                    existingSubmissions={[...thumbnails, ...extraUnsubmittedThumbnails]}
                    onSelect={(t, oldTime) => {
                        selectedThumbnail.current = t;

                        if (!t.original) {
                            const unsubmitted = Config.local!.unsubmitted[props.videoID] ??= {
                                thumbnails: [],
                                titles: []
                            };

                            const existingSubmission = unsubmitted.thumbnails.findIndex((s) => !s.original && s.timestamp === oldTime);
                            if (existingSubmission !== -1) {
                                unsubmitted.thumbnails[existingSubmission] = t;
                            } else {
                                unsubmitted.thumbnails.push(t);
                            }

                            Config.forceLocalUpdate("unsubmitted");
                        }
                    }}></ThumbnailDrawerComponent>
            </div>

            <div>
                <TitleDrawerComponent existingSubmissions={[...titles, ...extraUnsubmittedTitles]} 
                    onSelectOrUpdate={(t, oldTitle) => {
                        selectedTitle.current = t;

                        if (t.title !== originalTitle) {
                            const unsubmitted = Config.local!.unsubmitted[props.videoID] ??= {
                                thumbnails: [],
                                titles: []
                            };

                            const existingSubmission = unsubmitted.titles.findIndex((s) => s.title === oldTitle);
                            if (existingSubmission !== -1) {
                                unsubmitted.titles[existingSubmission] = {
                                    title: t.title
                                };
                            } else {
                                unsubmitted.titles.push({
                                    title: t.title
                                });
                            }

                            Config.forceLocalUpdate("unsubmitted");
                        }
                    }}></TitleDrawerComponent>
            </div>

            <hr className="cbLine">
            </hr>

            <div className="cbSubmitInstructions">
                {chrome.i18n.getMessage("chooseDescriptive")}
            </div>

            <button className="cbNoticeButton cbVoteButton" onClick={() => void props.submitClicked({
                ...selectedTitle.current,
                original: selectedTitle.current.title === originalTitle
            }, selectedThumbnail.current)}>
                {`${chrome.i18n.getMessage("Vote")}!`}
            </button>
        </div>
    );
};
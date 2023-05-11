import * as React from "react";
import { CustomThumbnailResult, ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { getCurrentPageTitle, TitleSubmission } from "../titles/titleData";
import { BrandingResult } from "../videoBranding/videoBranding";
import { ThumbnailType } from "./ThumbnailComponent";
import { RenderedThumbnailSubmission, ThumbnailDrawerComponent } from "./ThumbnailDrawerComponent";
import { RenderedTitleSubmission, TitleDrawerComponent } from "./TitleDrawerComponent";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import Config, { UnsubmittedSubmission } from "../config";
import { addTitleChangeListener, removeTitleChangeListener } from "../utils/titleBar";
import { toSentenceCase } from "../titles/titleFormatter";

export interface SubmissionComponentProps {
    videoID: VideoID;
    video: HTMLVideoElement;
    submissions: BrandingResult;
    
    submitClicked: (title: TitleSubmission | null, thumbnail: ThumbnailSubmission | null) => void;
}

export const SubmissionComponent = (props: SubmissionComponentProps) => {
    const originalTitle = toSentenceCase(getCurrentPageTitle() || chrome.i18n.getMessage("OriginalTitle"), false);
    const titles: RenderedTitleSubmission[] = [{
        title: originalTitle
    }, {
        title: chrome.i18n.getMessage("TypeYourOwnTitleHere")
    }, ...props.submissions.titles
    .filter((s) => s.title !== originalTitle)
    .map((s) => ({
        title: s.title
    }))];

    const defaultThumbnails: RenderedThumbnailSubmission[] = [{
        type: ThumbnailType.Original
    }, {
        type: ThumbnailType.CurrentTime
    }];
    const downloadedThumbnails: RenderedThumbnailSubmission[] = props.submissions.thumbnails
    .filter((s) => !s.original)
    .map((s: CustomThumbnailResult) => ({
        timestamp: s.timestamp,
        type: ThumbnailType.SpecifiedTime
    }));
    const thumbnails = defaultThumbnails.concat(downloadedThumbnails);

    const selectedTitle = React.useRef<RenderedTitleSubmission | null>(null);
    const selectedThumbnail = React.useRef<ThumbnailSubmission | null>(null);
    const [selectedTitleIndex, setSelectedTitleIndex] = React.useState(-1);
    const [selectedThumbnailIndex, setSelectedThumbnailIndex] = React.useState(-1);

    // Load existing unsubmitted thumbnails whenever a videoID change happens
    const [extraUnsubmittedThumbnails, setExtraUnsubmittedThumbnails] = React.useState<RenderedThumbnailSubmission[]>([]);
    const [extraUnsubmittedTitles, setExtraUnsubmittedTitles] = React.useState<RenderedTitleSubmission[]>([]);
    const videoChangeListener = () => {
        selectedTitle.current = null;
        selectedThumbnail.current = null;
        setSelectedTitleIndex(-1);
        setSelectedThumbnailIndex(-1);

        const unsubmitted = Config.local!.unsubmitted[props.videoID];
        updateUnsubmitted(unsubmitted, setExtraUnsubmittedThumbnails, setExtraUnsubmittedTitles, thumbnails, titles);
    };
    const titleChangeListener = React.useRef<() => void>(() => videoChangeListener());

    React.useEffect(() => {
        if (titleChangeListener.current) {
            removeTitleChangeListener(titleChangeListener.current);
            titleChangeListener.current = () => videoChangeListener();
        }
        addTitleChangeListener(titleChangeListener.current);
    
        videoChangeListener();
    }, [props.videoID]);

    return (
        <div className="submissionMenuInner">
            <div style={{ display: "flex", overflowX: "auto" }}>
                <ThumbnailDrawerComponent 
                    video={props.video} 
                    videoId={props.videoID} 
                    existingSubmissions={[...defaultThumbnails, ...extraUnsubmittedThumbnails, ...downloadedThumbnails]}
                    selectedThumbnailIndex={selectedThumbnailIndex}
                    onSelect={(t, i) => {
                        let selectedIndex = i;
                        if (selectedThumbnailIndex === i) {
                            // Deselect
                            setSelectedThumbnailIndex(-1);
                            selectedThumbnail.current = null;
                            return;
                        }

                        if (!t.original) {
                            const unsubmitted = Config.local!.unsubmitted[props.videoID] ??= {
                                thumbnails: [],
                                titles: []
                            };

                            const existingSubmission = unsubmitted.thumbnails.findIndex((s) => !s.original && s.timestamp === t.timestamp);
                            if (existingSubmission === -1) {
                                unsubmitted.thumbnails.unshift(t);

                                // Next one up
                                selectedIndex = defaultThumbnails.length;
                            } else {
                                selectedIndex = defaultThumbnails.length + existingSubmission;
                            }

                            updateUnsubmitted(unsubmitted, setExtraUnsubmittedThumbnails, setExtraUnsubmittedTitles, thumbnails, titles);
                            Config.forceLocalUpdate("unsubmitted");
                        }

                        setSelectedThumbnailIndex(selectedIndex);
                        selectedThumbnail.current = t;
                    }}></ThumbnailDrawerComponent>
            </div>

            <div>
                <TitleDrawerComponent existingSubmissions={[...titles, ...extraUnsubmittedTitles]}
                    selectedTitleIndex={selectedTitleIndex}
                    onDeselect={() => {
                        setSelectedTitleIndex(-1);
                        selectedTitle.current = null;
                    }}
                    onSelectOrUpdate={(t, oldTitle, i) => {
                        setSelectedTitleIndex(i);
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

            <button className="cbNoticeButton cbVoteButton" disabled={!selectedThumbnail.current && !selectedTitle.current}
                onClick={() => void props.submitClicked(selectedTitle.current ? {
                ...selectedTitle.current,
                original: selectedTitle.current.title === getCurrentPageTitle()
            } : null, selectedThumbnail.current)}>
                {`${chrome.i18n.getMessage("Vote")}!`}
            </button>
        </div>
    );
};

function updateUnsubmitted(unsubmitted: UnsubmittedSubmission,
        setExtraUnsubmittedThumbnails: React.Dispatch<React.SetStateAction<RenderedThumbnailSubmission[]>>,
        setExtraUnsubmittedTitles: React.Dispatch<React.SetStateAction<RenderedTitleSubmission[]>>,
        thumbnails: RenderedThumbnailSubmission[], titles: RenderedTitleSubmission[]) {
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
}
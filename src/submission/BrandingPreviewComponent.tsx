import { VideoID } from "../../maze-utils/src/video";
import * as React from "react";
import { formatTitleInternal } from "../titles/titleFormatter";
import { BrandingResult } from "../videoBranding/videoBranding";
import { ThumbnailType } from "./ThumbnailComponent";
import { RenderedThumbnailSubmission } from "./ThumbnailDrawerComponent";
import { ThumbnailSelectionComponent } from "./ThumbnailSelectionComponent";
import { RenderedTitleSubmission } from "./TitleDrawerComponent";
import { TitleFormatting } from "../config/config";
import { FormattedText } from "../popup/FormattedTextComponent";

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
    const [sentenceCaseTitle, setSentenceCaseTitle] = React.useState("");
    const [titleCaseTitle, setTitleCaseTitle] = React.useState("");
    const [displayedThumbnail, setDisplayedThumbnail] = React.useState(getDefaultThumbnail(props.submissions, props.thumbnails));

    React.useEffect(() => {
        (async () => {
            const title = props.selectedTitle?.title || getDefaultTitle(props.submissions, props.titles)?.title;
            if (title) {
                setSentenceCaseTitle(await formatTitleInternal(title, true, TitleFormatting.SentenceCase, false));
                setTitleCaseTitle(await formatTitleInternal(title, true, TitleFormatting.TitleCase, false));
            }
        })();
    }, [props.selectedTitle, props.submissions, props.titles]);

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
                larger={true}
            ></ThumbnailSelectionComponent>

            <fieldset className="cbTitlePreviewBox">
                <span className="cbTitle cbTitlePreview">
                    {sentenceCaseTitle}
                </span>

                <legend className="cbTitlePreviewTypeName">
                    <FormattedText
                        langKey={"SentenceCase"}
                        titleFormatting={TitleFormatting.SentenceCase}
                    />
                </legend>
            </fieldset>

            <fieldset className="cbTitlePreviewBox">
                <span className="cbTitle cbTitlePreview">
                    {titleCaseTitle}
                </span>

                <legend className="cbTitlePreviewTypeName">
                    <FormattedText
                        langKey={"TitleCase"}
                        titleFormatting={TitleFormatting.TitleCase}
                    />
                </legend>
            </fieldset>

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
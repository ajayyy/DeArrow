import * as React from "react";
import { objectToURI } from "../../maze-utils/src";
import { getFormattedTime } from "../../maze-utils/src/formating";
import { getHash } from "../../maze-utils/src/hash";
import { VideoID } from "../../maze-utils/src/video";
import Config, { TitleFormatting } from "../config/config";
import { LicenseComponent } from "../license/LicenseComponent";
import { FormattedText } from "../popup/FormattedTextComponent";
import { ToggleOptionComponent } from "../popup/ToggleOptionComponent";
import { YourWorkComponent } from "../popup/YourWorkComponent";
import AddIcon from "../svgIcons/addIcon";
import CursorIcon from "../svgIcons/cursorIcon";
import DownvoteIcon from "../svgIcons/downvoteIcon";
import ExclamationIcon from "../svgIcons/exclamationIcon";
import FontIcon from "../svgIcons/fontIcon";
import PersonIcon from "../svgIcons/personIcon";
import QuestionIcon from "../svgIcons/questionIcon";
import UpvoteIcon from "../svgIcons/upvoteIcon";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { formatTitleInternal } from "../titles/titleFormatter";
import { RenderedTitleSubmission, TitleDrawerComponent } from "../submission/TitleDrawerComponent";
import { TitleResult } from "../titles/titleData";

export interface NebulaTitleEditorComponentProps {
    videoSlug: string;
    originalTitle: string;
    initialCustomTitle: string | null;
    initialCustomThumbnail: ThumbnailSubmission | null;
    initialCustomThumbnailPreviewUrl?: string | null;
    originalThumbnailUrl: string | null;
    videoElement: HTMLVideoElement | null;
    serverTitles: TitleResult[];
    initialUpvotedTitleIndex: number;
    onCustomTitleChange: (title: string | null) => void;
    onCustomThumbnailChange: (thumbnail: ThumbnailSubmission | null, previewDataUrl?: string | null) => void;
    onTitleVote: (title: TitleResult, downvote: boolean) => Promise<boolean>;
    onClose: () => void;
}

interface ChatDisplayName {
    publicUserID: string;
    username: string | null;
}

export const NebulaTitleEditorComponent = (props: NebulaTitleEditorComponentProps) => {
    // Build initial title list: original, blank custom entry, then server submissions
    const serverTitleEntries: RenderedTitleSubmission[] = props.serverTitles
        .filter((s) => s.title !== props.originalTitle)
        .map((s) => ({
            title: s.title,
            original: s.original,
            votable: true,
            locked: s.locked,
        }));

    const [titles, setTitles] = React.useState<RenderedTitleSubmission[]>([
        {
            title: props.originalTitle,
            original: true,
            votable: true,
            locked: props.serverTitles.some((s) => s.title === props.originalTitle && s.locked),
        },
        {
            title: props.initialCustomTitle ?? "",
            original: false,
            votable: false,
            locked: false,
        },
        ...serverTitleEntries,
    ]);
    const [selectedTitleIndex, setSelectedTitleIndex] = React.useState(props.initialCustomTitle ? 1 : 0);
    const [upvotedTitleIndex, setUpvotedTitleIndex] = React.useState(props.initialUpvotedTitleIndex);
    const [selectedThumbnail, setSelectedThumbnail] = React.useState<ThumbnailSubmission | null>(
        props.initialCustomThumbnail ?? { original: true }
    );
    const [selectedCurrentTime, setSelectedCurrentTime] = React.useState(
        !props.initialCustomThumbnail?.original && props.initialCustomThumbnail?.timestamp != null
            ? props.initialCustomThumbnail.timestamp
            : getSafeCurrentTime(props.videoElement)
    );
    const currentCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [currentFrameDataUrl, setCurrentFrameDataUrl] = React.useState<string | null>(null);
    const [selectedTimestampPreviewDataUrl, setSelectedTimestampPreviewDataUrl] = React.useState<string | null>(
        props.initialCustomThumbnailPreviewUrl ?? null
    );
    const [sentenceCaseTitle, setSentenceCaseTitle] = React.useState(props.originalTitle);
    const [titleCaseTitle, setTitleCaseTitle] = React.useState(props.originalTitle);
    const [actAsVip, setActAsVip] = React.useState(Config.config!.actAsVip);
    const [chatDisplayName, setChatDisplayName] = React.useState<ChatDisplayName | null>(null);
    const titleFormatting = Config.config!.titleFormatting;

    const selectedTitle = React.useMemo(() => titles[selectedTitleIndex] ?? null, [titles, selectedTitleIndex]);
    const normalizedSelectedTitle = normalizeTitle(selectedTitle?.title ?? "", props.originalTitle);
    const normalizedInitialTitle = normalizeTitle(props.initialCustomTitle, props.originalTitle);
    const previewTitle = normalizedSelectedTitle ?? props.originalTitle;

    const titleChanged = normalizedInitialTitle !== normalizedSelectedTitle;
    const initialThumbnailSignature = getThumbnailSignatureWithTime(props.initialCustomThumbnail, props.initialCustomThumbnail?.original ? 0 : props.initialCustomThumbnail?.timestamp ?? 0);
    const selectedThumbnailSignature = getThumbnailSignatureWithTime(selectedThumbnail, selectedCurrentTime);
    const thumbnailChanged = initialThumbnailSignature !== selectedThumbnailSignature;

    React.useEffect(() => {
        let active = true;

        getHash(Config.config!.userID!).then((publicUserID) => {
            if (active) {
                setChatDisplayName({
                    publicUserID,
                    username: null
                });
            }
        }).catch(() => {
            if (active) {
                setChatDisplayName(null);
            }
        });

        return () => {
            active = false;
        };
    }, []);

    React.useEffect(() => {
        let active = true;

        (async () => {
            const sentenceTitle = await formatTitleInternal(previewTitle, true, TitleFormatting.SentenceCase, false);
            const titleCase = await formatTitleInternal(previewTitle, true, TitleFormatting.TitleCase, false);

            if (active) {
                setSentenceCaseTitle(sentenceTitle);
                setTitleCaseTitle(titleCase);
            }
        })().catch(() => {
            if (active) {
                setSentenceCaseTitle(previewTitle);
                setTitleCaseTitle(previewTitle);
            }
        });

        return () => {
            active = false;
        };
    }, [previewTitle]);

    React.useEffect(() => {
        const videoElement = props.videoElement;
        const canvasElement = currentCanvasRef.current;
        if (!videoElement || !canvasElement) {
            return;
        }

        const context = canvasElement.getContext("2d");
        if (!context) {
            return;
        }

        const drawFrame = () => {
            const width = canvasElement.width;
            const height = canvasElement.height;

            context.clearRect(0, 0, width, height);
            try {
                context.drawImage(videoElement, 0, 0, width, height);
                setCurrentFrameDataUrl(canvasElement.toDataURL("image/jpeg", 0.85));
            } catch {
                return;
            }
        };

        const onSeekOrTime = () => {
            drawFrame();
        };

        const onPlay = () => {
            drawFrame();
        };

        drawFrame();

        videoElement.addEventListener("seeked", onSeekOrTime);
        videoElement.addEventListener("timeupdate", onSeekOrTime);
        videoElement.addEventListener("loadeddata", onSeekOrTime);
        videoElement.addEventListener("play", onPlay);

        return () => {
            videoElement.removeEventListener("seeked", onSeekOrTime);
            videoElement.removeEventListener("timeupdate", onSeekOrTime);
            videoElement.removeEventListener("loadeddata", onSeekOrTime);
            videoElement.removeEventListener("play", onPlay);
        };

    }, [props.videoElement]);

    const timestampLabel = getFormattedTime(selectedCurrentTime) || "";
    const selectedThumbnailPreviewUrl = selectedTimestampPreviewDataUrl
        ?? currentFrameDataUrl
        ?? props.originalThumbnailUrl
        ?? null;

    const onCurrentTimeClick = () => {
        const currentTime = getSafeCurrentTime(props.videoElement);
        setSelectedCurrentTime(currentTime);
        setSelectedThumbnail({
            original: false,
            timestamp: currentTime
        });
        setSelectedTimestampPreviewDataUrl(currentFrameDataUrl ?? props.originalThumbnailUrl ?? null);
    };

    const onOriginalClick = () => {
        setSelectedThumbnail({ original: true });
    };

    const canSubmit = titleChanged || thumbnailChanged;

    return (
        <div className="submissionMenuInner cbNebulaEditorLayout"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}>
            <div className="cbNebulaEditorPrimaryColumn">
                <div className="cbBrandingPreview cbNebulaBrandingPreview">
                    <div className="cbThumbnail">
                        {
                            (selectedThumbnail && !selectedThumbnail.original && selectedThumbnailPreviewUrl) ?
                                <img className="cbThumbnailImg" src={selectedThumbnailPreviewUrl}></img>
                                : props.originalThumbnailUrl
                                    ? <img className="cbThumbnailImg" src={props.originalThumbnailUrl}></img>
                                    : <div className="cbThumbnailImg"></div>
                        }
                    </div>

                    <fieldset className="cbTitlePreviewBox">
                        <span className="cbTitle cbTitlePreview">
                            {sentenceCaseTitle}
                        </span>

                        <legend className="cbTitlePreviewTypeName">
                            {chrome.i18n.getMessage("SentenceCase") || "Sentence case"}
                        </legend>
                    </fieldset>

                    <fieldset className="cbTitlePreviewBox">
                        <span className="cbTitle cbTitlePreview">
                            {titleCaseTitle}
                        </span>

                        <legend className="cbTitlePreviewTypeName">
                            {chrome.i18n.getMessage("TitleCase") || "Title Case"}
                        </legend>
                    </fieldset>
                </div>

                {
                    Config.config!.showGuidelineHelp
                        ? <YourWorkComponent titleFormatting={titleFormatting} />
                        : null
                }
            </div>

            <div className="cbNebulaEditorSecondaryColumn">
                <div className="cbThumbnailDrawer">
                    <div className="cbNebulaLocalOnlyNotice">
                        {chrome.i18n.getMessage("nebulaThumbnailLocalOnly") || "Thumbnails are local only on Nebula — your selection is only visible to you and is not shared with other users."}
                    </div>
                    <div
                        className={`cbThumbnail${selectedThumbnail?.original ? " cbThumbnailSelected" : ""}`}
                        onClick={onOriginalClick}>
                        {
                            props.originalThumbnailUrl ?
                                <img className="cbThumbnailImg" src={props.originalThumbnailUrl}></img>
                                : <div className="cbThumbnailImg"></div>
                        }
                        <div style={{ fontWeight: "bold", textAlign: "center", marginTop: "4px" }}>
                            {chrome.i18n.getMessage("Original") || "Original"}
                        </div>
                    </div>

                    <div
                        className="cbThumbnail"
                        onClick={onCurrentTimeClick}>
                        <canvas className="cbThumbnailImg" ref={currentCanvasRef} width={402} height={227}></canvas>
                        <div className="cbAddThumbnailOverlay">
                            <AddIcon width="60%" height="60%" />
                        </div>
                        <div style={{ fontWeight: "bold", textAlign: "center", marginTop: "4px" }}>
                            {chrome.i18n.getMessage("CurrentTime") || "Current time"}
                        </div>
                    </div>

                    {/* Server thumbnail submissions are not shown on Nebula:
                        timestamps cannot be rendered into images without unauthenticated
                        video stream access, so there is nothing useful to display or vote on. */}

                    {
                        selectedThumbnail && !selectedThumbnail.original ?
                            <div
                                className="cbThumbnail cbThumbnailSelected"
                                onClick={() => {
                                    setSelectedThumbnail({
                                        original: false,
                                        timestamp: selectedCurrentTime
                                    });
                                }}>
                                {
                                    selectedThumbnailPreviewUrl ?
                                        <img className="cbThumbnailImg" src={selectedThumbnailPreviewUrl}></img>
                                        : <div className="cbThumbnailImg"></div>
                                }

                                <div style={{ fontWeight: "bold", textAlign: "center", marginTop: "4px" }}>
                                    {timestampLabel}
                                </div>

                                <div className="cbVoteButtons" style={{ visibility: "hidden" }}>
                                    <button className="cbButton" type="button" title={chrome.i18n.getMessage("upvote") || "Upvote"} onClick={(event) => event.stopPropagation()}>
                                        <UpvoteIcon />
                                    </button>
                                    <button className="cbButton" type="button" title={chrome.i18n.getMessage("downvote") || "Downvote"} onClick={(event) => event.stopPropagation()}>
                                        <DownvoteIcon />
                                    </button>
                                </div>
                            </div>
                            : null
                    }
                </div>

                <div>
                    <TitleDrawerComponent
                        existingSubmissions={titles}
                        selectedTitleIndex={selectedTitleIndex}
                        upvotedTitleIndex={upvotedTitleIndex}
                        actAsVip={actAsVip}
                        videoID={props.videoSlug as VideoID}
                        onDeselect={() => {
                            setSelectedTitleIndex(-1);
                        }}
                        onUpvote={(index) => {
                            setUpvotedTitleIndex(index);
                        }}
                        onVote={(submission, downvote) => {
                            // Find the matching server TitleResult for the submission
                            const serverTitle = props.serverTitles.find((t) => t.title === submission.title);
                            if (serverTitle) {
                                return props.onTitleVote(serverTitle, downvote);
                            }
                            // For the original title, construct a minimal TitleResult
                            if (submission.original) {
                                return props.onTitleVote({
                                    title: submission.title,
                                    original: true,
                                    votes: 0,
                                    locked: submission.locked,
                                    UUID: "" as never,
                                }, downvote);
                            }
                            return Promise.resolve(false);
                        }}
                        onSelectOrUpdate={(submission, _oldTitle, index) => {
                            setSelectedTitleIndex(index);

                            setTitles((existingTitles) => {
                                const updatedTitles = [...existingTitles];
                                updatedTitles[index] = {
                                    ...updatedTitles[index],
                                    title: submission.title
                                };

                                return updatedTitles;
                            });
                        }} />
                </div>

                {
                    Config.config!.vip &&
                    <div className="cbVipToggles">
                        <ToggleOptionComponent
                            id="actAsVip"
                            onChange={(value) => {
                                setActAsVip(value);
                                Config.config!.actAsVip = value;
                            }}
                            value={actAsVip}
                            label={chrome.i18n.getMessage("actAsVip")}
                            titleFormatting={titleFormatting}
                        />
                    </div>
                }

                <div className="cbVoteButtonContainer">
                    <button
                        className="cbNoticeButton cbVoteButton"
                        disabled={!canSubmit}
                        onClick={() => {
                            const titleToSave = selectedTitleIndex <= 0 || !normalizedSelectedTitle
                                ? null
                                : normalizedSelectedTitle;
                            props.onCustomTitleChange(titleToSave);

                            if (!selectedThumbnail || selectedThumbnail.original) {
                                props.onCustomThumbnailChange(null, null);
                            } else {
                                props.onCustomThumbnailChange({
                                    original: false,
                                    timestamp: selectedCurrentTime
                                }, selectedTimestampPreviewDataUrl ?? currentFrameDataUrl);
                            }

                            props.onClose();
                        }}>
                        <FormattedText
                            langKey="submit"
                            titleFormatting={titleFormatting}
                        />
                    </button>

                    <button
                        className="cbNoticeButton cbVoteButton cbCancelButton"
                        onClick={() => props.onClose()}>
                        {chrome.i18n.getMessage("Cancel") || "Cancel"}
                    </button>
                </div>

                {
                    Config.config!.showGuidelineHelp ?
                        <>
                            <hr className="cbLine" />

                            <div className="cbHelpContainer">
                                {getNebulaTips()}
                            </div>

                            <div className="cbHelpButtonContainer">
                                <a className="cbNoticeButton"
                                    href="https://wiki.sponsor.ajay.app/w/DeArrow/Guidelines"
                                    target="_blank"
                                    rel="noreferrer">
                                    <FormattedText
                                        langKey="Guidelines"
                                        titleFormatting={titleFormatting}
                                    />
                                </a>

                                <a className="cbNoticeButton"
                                    href={`https://chat.sponsor.ajay.app/#${objectToURI("", {
                                        displayName: getNebulaChatDisplayName(chatDisplayName),
                                        customDescription: `${chrome.i18n.getMessage("chatboxDescription")}\n\nhttps://discord.gg/SponsorBlock\nhttps://matrix.to/#/#sponsor:ajay.app?via=matrix.org`,
                                        bigDescription: true
                                    }, false)}`}
                                    target="_blank"
                                    rel="noreferrer">
                                    <FormattedText
                                        langKey="askAQuestion"
                                        titleFormatting={titleFormatting}
                                    />
                                </a>
                            </div>

                            <LicenseComponent titleFormatting={titleFormatting} />
                        </>
                        : null
                }
            </div>
        </div>
    );
};

function getNebulaTips(): React.ReactElement[] {
    const tipInfo = [{
        icon: PersonIcon,
        text: chrome.i18n.getMessage("tip1"),
        forcedFormatting: null,
    }, {
        icon: QuestionIcon,
        text: chrome.i18n.getMessage("tip2"),
        forcedFormatting: null,
    }, {
        icon: ExclamationIcon,
        text: chrome.i18n.getMessage("tip3"),
        forcedFormatting: null,
    }, {
        icon: CursorIcon,
        text: chrome.i18n.getMessage("tip4"),
        forcedFormatting: null,
    }, {
        icon: FontIcon,
        text: chrome.i18n.getMessage("tip5"),
        forcedFormatting: TitleFormatting.Disable,
    }];

    return tipInfo.map((tip, index) => (
        <div className="cbTip" key={index}>
            <tip.icon className="cbTipIcon" />
            <span className="cbTipText">
                <FormattedText
                    text={tip.text}
                    titleFormatting={tip.forcedFormatting ?? Config.config!.titleFormatting}
                />
            </span>
        </div>
    ));
}

function getNebulaChatDisplayName(chatDisplayName: ChatDisplayName | null): string {
    if (chatDisplayName) {
        if (chatDisplayName.username && chatDisplayName.username !== chatDisplayName.publicUserID) {
            return `${chatDisplayName.username} - ${chatDisplayName.publicUserID}`;
        }

        return chatDisplayName.publicUserID;
    }

    return "DeArrow User";
}

function normalizeTitle(title: string | null, originalTitle: string): string | null {
    const cleanTitle = (title ?? "").trim();

    if (!cleanTitle || cleanTitle === originalTitle) {
        return null;
    }

    return cleanTitle;
}

function getSafeCurrentTime(videoElement: HTMLVideoElement | null): number {
    const domTime = getCurrentTimeFromNebulaTimestampDom();
    if (domTime != null) {
        return domTime;
    }

    if (!videoElement) {
        return 0;
    }

    const time = videoElement.currentTime;
    return Number.isFinite(time) && time >= 0 ? time : 0;
}

function getCurrentTimeFromNebulaTimestampDom(): number | null {
    const primaryTimeElement = document.querySelector(".css-lopiju .css-j7bstq");
    const primaryTime = parseTimestampToSeconds(primaryTimeElement?.textContent ?? "");
    if (primaryTime != null) {
        return primaryTime;
    }

    const containerElement = document.querySelector(".css-lopiju");
    const containerText = (containerElement?.textContent ?? "").replace(/\u00a0/gu, " ").trim();
    if (!containerText) {
        return null;
    }

    const beforeSlash = containerText.split("/")[0]?.trim() ?? "";
    return parseTimestampToSeconds(beforeSlash);
}

function parseTimestampToSeconds(rawTimestamp: string): number | null {
    const normalized = rawTimestamp.trim();
    if (!normalized) {
        return null;
    }

    const parts = normalized.split(":").map((part) => part.trim());
    if (parts.length < 1 || parts.length > 3) {
        return null;
    }

    if (parts.some((part) => part.length === 0 || !/^\d+$/u.test(part))) {
        return null;
    }

    const values = parts.map((part) => Number(part));
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
        return null;
    }

    if (values.length === 3) {
        return values[0] * 3600 + values[1] * 60 + values[2];
    }

    if (values.length === 2) {
        return values[0] * 60 + values[1];
    }

    return values[0];
}

function getThumbnailSignatureWithTime(thumbnail: ThumbnailSubmission | null, selectedCurrentTime: number): string {
    if (!thumbnail || thumbnail.original) {
        return "original";
    }

    return `current-${Math.round((selectedCurrentTime ?? thumbnail.timestamp ?? 0) * 10) / 10}`;
}

import * as React from "react";
import { CustomThumbnailResult, ThumbnailSubmission, isLiveSync } from "../thumbnails/thumbnailData";
import { getCurrentPageTitle, TitleSubmission } from "../titles/titleData";
import { BrandingResult } from "../videoBranding/videoBranding";
import { ThumbnailType } from "./ThumbnailComponent";
import { RenderedThumbnailSubmission, ThumbnailDrawerComponent } from "./ThumbnailDrawerComponent";
import { RenderedTitleSubmission, TitleDrawerComponent } from "./TitleDrawerComponent";
import { VideoID } from "../../maze-utils/src/video";
import Config, { UnsubmittedSubmission } from "../config/config";
import { addTitleChangeListener, removeTitleChangeListener } from "../utils/titleBar";
import { toSentenceCase } from "../../maze-utils/src/titleFormatter/formatters/sentenceCase";
import { BrandingPreviewComponent } from "./BrandingPreviewComponent";
import { getHash } from "../../maze-utils/src/hash";
import { sendRequestToServer } from "../utils/requests";
import { objectToURI } from "../../maze-utils/src";
import { logError } from "../utils/logger";
import { YourWorkComponent } from "../popup/YourWorkComponent";
import PersonIcon from "../svgIcons/personIcon";
import QuestionIcon from "../svgIcons/questionIcon";
import ExclamationIcon from "../svgIcons/exclamationIcon";
import CursorIcon from "../svgIcons/cursorIcon";
import FontIcon from "../svgIcons/fontIcon";
import { Tooltip } from "../utils/tooltip";
import { LicenseComponent } from "../license/LicenseComponent";
import { ToggleOptionComponent } from "../popup/ToggleOptionComponent";
import { FormattedText } from "../popup/FormattedTextComponent";

export interface SubmissionComponentProps {
    videoID: VideoID;
    video: HTMLVideoElement;
    submissions: BrandingResult;

    submitClicked: (title: TitleSubmission | null, thumbnail: ThumbnailSubmission | null, actAsVip: boolean) => Promise<boolean>;
}

interface ChatDisplayName {
    publicUserID: string;
    username: string | null;
}

export const SubmissionComponent = (props: SubmissionComponentProps) => {
    const [chatDisplayName, setChatDisplayName] = React.useState<ChatDisplayName | null>(null);
    React.useEffect(() => {
        getHash(Config.config!.userID!).then(async (publicUserID) => {
            let username: string | null = null;

            const displayName = {
                publicUserID,
                username
            };
            setChatDisplayName(displayName);

            const values = ["userName", "deArrowWarningReason"];
                const result = await sendRequestToServer("GET", "/api/userInfo", {
                    publicUserID: publicUserID,
                    values
                });

            if (result.ok) {
                const userInfo = JSON.parse(result.responseText);
                username = userInfo.userName;

                if (userInfo.deArrowWarningReason) {
                    createWarningTooltip(userInfo.deArrowWarningReason, displayName);
                }
            }

            setChatDisplayName({
                publicUserID,
                username
            });
        }).catch(logError);
    }, []);

    const [currentlySubmitting, setCurrentlySubmitting] = React.useState(false);

    const [originalTitle, setOriginalTitle] = React.useState("");
    const [titles, setTitles] = React.useState<RenderedTitleSubmission[]>([]);
    React.useEffect(() => {
        (async () => {
            const originalTitle = await toSentenceCase(getCurrentPageTitle() || chrome.i18n.getMessage("OriginalTitle"), false);
            setOriginalTitle(originalTitle);

            setTitles([{
                title: originalTitle,
                original: true,
                votable: true,
                locked: props.submissions.titles.some((s) => s.title === originalTitle && s.locked)
            }, {
                title: "",
                original: false,
                votable: false,
                locked: false
            }, ...props.submissions.titles
            .filter((s) => s.title !== originalTitle)
            .map((s) => ({
                title: s.title,
                original: s.original,
                votable: true,
                locked: s.locked
            }))]);
        })();
    }, []);

    const [actAsVip, setActAsVip] = React.useState(true);

    const defaultThumbnails: RenderedThumbnailSubmission[] = [{
        type: ThumbnailType.Original,
        votable: true,
        locked: props.submissions.thumbnails.some((s) => s.original && s.locked)
    }];
    if (!isLiveSync(props.videoID)) {
        defaultThumbnails.push({
            type: ThumbnailType.CurrentTime,
            votable: false,
            locked: false
        });
    }

    const downloadedThumbnails: RenderedThumbnailSubmission[] = props.submissions.thumbnails
    .filter((s) => !s.original)
    .map((s: CustomThumbnailResult) => ({
        timestamp: s.timestamp,
        type: ThumbnailType.SpecifiedTime,
        votable: true,
        locked: s.locked
    }));
    const thumbnails = defaultThumbnails.concat(downloadedThumbnails);

    const [selectedTitle, setSelectedTitle] = React.useState<RenderedTitleSubmission | null>(null);
    const selectedThumbnail = React.useRef<ThumbnailSubmission | null>(null);
    const [selectedTitleIndex, setSelectedTitleIndex] = React.useState(-1);
    const [selectedThumbnailIndex, setSelectedThumbnailIndex] = React.useState(-1);

    // Load existing unsubmitted thumbnails whenever a videoID change happens
    const [extraUnsubmittedThumbnails, setExtraUnsubmittedThumbnails] = React.useState<RenderedThumbnailSubmission[]>([]);
    const [extraUnsubmittedTitles, setExtraUnsubmittedTitles] = React.useState<RenderedTitleSubmission[]>([]);
    const videoChangeListener = () => {
        setSelectedTitle(null);
        selectedThumbnail.current = null;
        setSelectedTitleIndex(-1);
        setSelectedThumbnailIndex(-1);

        const unsubmitted = Config.local!.unsubmitted[props.videoID];
        updateUnsubmitted(unsubmitted, setExtraUnsubmittedThumbnails, setExtraUnsubmittedTitles, thumbnails, titles);
    };
    const titleChangeListener = React.useRef<() => void>(() => videoChangeListener());

    // Used to warn submitter to maybe not submit the original thumbnail
    const isAbTestedThumbnail = React.useRef<boolean | null>(null);

    React.useEffect(() => {
        if (titleChangeListener.current) {
            removeTitleChangeListener(titleChangeListener.current);
            titleChangeListener.current = () => videoChangeListener();
        }
        addTitleChangeListener(titleChangeListener.current);

        videoChangeListener();
    }, [props.videoID]);

    const titleFormatting = Config.config!.titleFormatting;

    const thumbnailSubmissions = [...defaultThumbnails, ...extraUnsubmittedThumbnails, ...downloadedThumbnails];
    return (
        <div className="submissionMenuInner"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}>
            <BrandingPreviewComponent
                submissions={props.submissions}
                titles={titles}
                thumbnails={thumbnails}
                selectedTitle={selectedTitle}
                selectedThumbnail={selectedThumbnailIndex >= 0 ? thumbnailSubmissions[selectedThumbnailIndex] : null}

                video={props.video}
                videoID={props.videoID}
            />

            <hr className="cbLine"/>

            <div className="cbThumbnailDrawer">
                <ThumbnailDrawerComponent
                    video={props.video}
                    videoId={props.videoID}
                    existingSubmissions={thumbnailSubmissions}
                    selectedThumbnailIndex={selectedThumbnailIndex}
                    actAsVip={actAsVip}
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
                            }

                            const { extraThumbnails } = updateUnsubmitted(unsubmitted, setExtraUnsubmittedThumbnails,
                                null, thumbnails, titles);
                            Config.forceLocalUpdate("unsubmitted");


                            if (existingSubmission !== -1) {
                                const extraUnsubmitted = extraThumbnails.findIndex((s) => s.type === ThumbnailType.SpecifiedTime
                                    && s.timestamp === t.timestamp);

                                if (extraUnsubmitted !== -1) {
                                    selectedIndex = defaultThumbnails.length + extraUnsubmitted;
                                }
                            }
                        }

                        if (t.original) {
                            handleAbTestedThumbnailWarning(props.videoID, isAbTestedThumbnail).catch(logError);
                        }

                        setSelectedThumbnailIndex(selectedIndex);
                        selectedThumbnail.current = t;
                    }}></ThumbnailDrawerComponent>
            </div>

            <div>
                <TitleDrawerComponent existingSubmissions={[...titles, ...extraUnsubmittedTitles]}
                    selectedTitleIndex={selectedTitleIndex}
                    actAsVip={actAsVip}
                    videoID={props.videoID}
                    onDeselect={() => {
                        setSelectedTitleIndex(-1);
                        setSelectedTitle(null);
                    }}
                    onSelectOrUpdate={(t, oldTitle, i) => {
                        setSelectedTitleIndex(i);
                        setSelectedTitle(t);

                        if (t.title !== oldTitle) {
                            const unsubmitted = Config.local!.unsubmitted[props.videoID] ??= {
                                thumbnails: [],
                                titles: []
                            };

                            const existingSubmission = unsubmitted.titles.findIndex((s) => s.title === oldTitle);

                            // If new title is an original title, remove it from unsubmitted
                            if (t.title === ""
                                    || t.title === originalTitle
                                    || props.submissions.titles.findIndex((s) => s.title === t.title) !== -1) {
                                if (existingSubmission !== -1) {
                                    unsubmitted.titles.splice(existingSubmission, 1);
                                }
                            } else if (t.title !== originalTitle) {
                                // Normal case
                                if (existingSubmission !== -1) {
                                    unsubmitted.titles[existingSubmission] = {
                                        title: t.title
                                    };
                                } else {
                                    unsubmitted.titles.push({
                                        title: t.title
                                    });
                                }
                            }

                            Config.forceLocalUpdate("unsubmitted");
                        }
                    }}></TitleDrawerComponent>
            </div>

            {
                Config.config!.vip &&
                <div className="cbVipToggles">
                    <ToggleOptionComponent
                        id="actAsVip"
                        onChange={(value) => {
                            setActAsVip(value);
                        }}
                        value={actAsVip}
                        label={chrome.i18n.getMessage("actAsVip")}
                        titleFormatting={titleFormatting}
                    />
                </div>
            }

            <div className="cbVoteButtonContainer">
                <button className="cbNoticeButton cbVoteButton"
                    disabled={currentlySubmitting
                                || (!selectedThumbnail.current && !selectedTitle)
                                || (!!selectedTitle && selectedTitle.title.toLowerCase() === chrome.i18n.getMessage("OriginalTitle").toLowerCase())}
                    onClick={async () => {
                        setCurrentlySubmitting(true);

                        props.submitClicked(selectedTitle ? {
                            ...selectedTitle,
                            original: selectedTitle.title === getCurrentPageTitle()
                                        || (!!getCurrentPageTitle() && selectedTitle.title === await toSentenceCase(getCurrentPageTitle()!, false))
                        } : null, selectedThumbnail.current, actAsVip).then((success) => {
                            if (!success) {
                                setCurrentlySubmitting(false);
                            }
                        });
                    }}>
                    <FormattedText
                        langKey="submit"
                        titleFormatting={titleFormatting}
                    />
                </button>
            </div>

            {
                Config.config!.showGuidelineHelp ?
                <>
                    <hr className="cbLine"/>

                    <div className="cbHelpContainer">
                        {getTips()}
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
                                displayName: getChatDisplayName(chatDisplayName),
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

                    <YourWorkComponent titleFormatting={titleFormatting} />

                    <LicenseComponent titleFormatting={titleFormatting} />
                </>
                : null
            }


        </div>
    );
};

async function handleAbTestedThumbnailWarning(videoID: string, isAbTestedThumbnail: React.MutableRefObject<boolean | null>) {
    if (isAbTestedThumbnail.current === null) {
        try {
            const request = await fetch(`https://i.ytimg.com/vi/${videoID}/mqdefault_custom_1.jpg`);
            isAbTestedThumbnail.current = request.ok;
        } catch {
            isAbTestedThumbnail.current = false;
        }
    }

    if (isAbTestedThumbnail.current) {
        alert(chrome.i18n.getMessage("abThumbnailsWarning"));
    }
}

function updateUnsubmitted(unsubmitted: UnsubmittedSubmission,
        setExtraUnsubmittedThumbnails: React.Dispatch<React.SetStateAction<RenderedThumbnailSubmission[]>>,
        setExtraUnsubmittedTitles: React.Dispatch<React.SetStateAction<RenderedTitleSubmission[]>> | null,
        thumbnails: RenderedThumbnailSubmission[], titles: RenderedTitleSubmission[]): {
            extraTitles: RenderedTitleSubmission[];
            extraThumbnails: RenderedThumbnailSubmission[];
        } {
    if (unsubmitted) {
        let titlesResult: RenderedTitleSubmission[] = [];
        let thumbnailsResult: RenderedThumbnailSubmission[] = [];

        const unsubmittedThumbnails = unsubmitted.thumbnails;
        if (unsubmittedThumbnails) {
            thumbnailsResult = unsubmittedThumbnails
                .filter((t) => thumbnails.every((s) => !t.original && (s.type !== ThumbnailType.SpecifiedTime
                    || s.timestamp !== t.timestamp)))
                .map((t) => ({
                type: ThumbnailType.SpecifiedTime,
                timestamp: (t as CustomThumbnailResult).timestamp,
                votable: false,
                locked: false
            }));

            setExtraUnsubmittedThumbnails(thumbnailsResult);
        }

        const unsubmittedTitles = unsubmitted.titles;
        if (unsubmittedTitles) {
            titlesResult = unsubmittedTitles
                .filter((t) => titles.every((s) => s.title !== t.title))
                .map((t) => ({
                    title: t.title,
                    original: false,
                    votable: false,
                    locked: false
                }));

            setExtraUnsubmittedTitles?.(titlesResult);
        }

        Config.forceLocalUpdate("unsubmitted");

        return {
            extraTitles: titlesResult,
            extraThumbnails: thumbnailsResult
        };
    } else {
        setExtraUnsubmittedThumbnails([]);
        setExtraUnsubmittedTitles?.([]);

        return {
            extraTitles: [],
            extraThumbnails: []
        };
    }
}

function getChatDisplayName(chatDisplayName: ChatDisplayName | null): string {
    if (chatDisplayName) {
        if (chatDisplayName.username && chatDisplayName.username !== chatDisplayName.publicUserID) {
            return `${chatDisplayName.username} - ${chatDisplayName.publicUserID}`;
        } else {
            return chatDisplayName.publicUserID;
        }
    } else {
        return "DeArrow User";
    }
}

function getTips(): React.ReactElement[] {
    const tipInfo = [{
        icon: PersonIcon,
        text: chrome.i18n.getMessage("tip1")
    }, {
        icon: QuestionIcon,
        text: chrome.i18n.getMessage("tip2")
    }, {
        icon: ExclamationIcon,
        text: chrome.i18n.getMessage("tip3")
    }, {
        icon: CursorIcon,
        text: chrome.i18n.getMessage("tip4")
    }, {
        icon: FontIcon,
        text: chrome.i18n.getMessage("tip5")
    }];

    return tipInfo.map((tip, i) => (
        <div className="cbTip" key={i}>
            <tip.icon className="cbTipIcon"/>
            <span className="cbTipText">
                <FormattedText
                    text={tip.text}
                    titleFormatting={Config.config!.titleFormatting}
                />
            </span>
        </div>
    ));
}

function createWarningTooltip(reason: string, name: ChatDisplayName) {
    const element = document.querySelector(".cbVoteButton") as HTMLElement | null;

    if (element) {
        const tooltip = new Tooltip({
            textBoxes: `${chrome.i18n.getMessage("deArrowMessageRecieved")}:\n\n${reason}`.split("\n"),
            referenceNode: element.parentElement!,
            prependElement: element,
            positionRealtive: false,
            containerAbsolute: true,
            bottomOffset: "25px",
            rightOffset: "0",
            leftOffset: "0",
            displayTriangle: true,
            extraClass: "centeredSBTriangle",
            center: true,
            showGotIt: false,
            buttonsAtBottom: true,
            textBoxMaxHeight: "350px",
            opacity: 1,
            buttons: [{
                name: chrome.i18n.getMessage("GotIt"),
                listener: async () => {
                    const result = await sendRequestToServer("POST", "/api/warnUser", {
                        userID: Config.config!.userID,
                        enabled: false,
                        type: 1
                    });

                    if (result.ok) {
                        tooltip?.close();
                    } else {
                        alert(`${chrome.i18n.getMessage("warningError")} ${result.status}`);
                    }
                }
            }, {
                name: chrome.i18n.getMessage("questionButton"),
                listener: () => window.open(`https://chat.sponsor.ajay.app/#${objectToURI("", {
                    displayName: getChatDisplayName(name),
                    customDescription: `${chrome.i18n.getMessage("chatboxDescription")}\n\nhttps://discord.gg/SponsorBlock\nhttps://matrix.to/#/#sponsor:ajay.app?via=matrix.org`,
                    bigDescription: true
                }, false)}`)
            }],
        });
    }
}

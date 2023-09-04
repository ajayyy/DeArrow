import * as React from "react";
import { CustomThumbnailResult, ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { getCurrentPageTitle, TitleSubmission } from "../titles/titleData";
import { BrandingResult } from "../videoBranding/videoBranding";
import { ThumbnailType } from "./ThumbnailComponent";
import { RenderedThumbnailSubmission, ThumbnailDrawerComponent } from "./ThumbnailDrawerComponent";
import { RenderedTitleSubmission, TitleDrawerComponent } from "./TitleDrawerComponent";
import { VideoID } from "../../maze-utils/src/video";
import Config, { UnsubmittedSubmission } from "../config/config";
import { addTitleChangeListener, removeTitleChangeListener } from "../utils/titleBar";
import { toSentenceCase } from "../titles/titleFormatter";
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

export interface SubmissionComponentProps {
    videoID: VideoID;
    video: HTMLVideoElement;
    submissions: BrandingResult;
    
    submitClicked: (title: TitleSubmission | null, thumbnail: ThumbnailSubmission | null) => Promise<boolean>;
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
                title: originalTitle
            }, {
                title: ""
            }, ...props.submissions.titles
            .filter((s) => s.title !== originalTitle)
            .map((s) => ({
                title: s.title
            }))]);
        })();
    }, []);

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

    React.useEffect(() => {
        if (titleChangeListener.current) {
            removeTitleChangeListener(titleChangeListener.current);
            titleChangeListener.current = () => videoChangeListener();
        }
        addTitleChangeListener(titleChangeListener.current);
    
        videoChangeListener();
    }, [props.videoID]);

    const thumbnailSubmissions = [...defaultThumbnails, ...extraUnsubmittedThumbnails, ...downloadedThumbnails];
    return (
        <div className="submissionMenuInner">
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

                        setSelectedThumbnailIndex(selectedIndex);
                        selectedThumbnail.current = t;
                    }}></ThumbnailDrawerComponent>
            </div>

            <div>
                <TitleDrawerComponent existingSubmissions={[...titles, ...extraUnsubmittedTitles]}
                    selectedTitleIndex={selectedTitleIndex}
                    onDeselect={() => {
                        setSelectedTitleIndex(-1);
                        setSelectedTitle(null);
                    }}
                    onSelectOrUpdate={(t, oldTitle, i) => {
                        setSelectedTitleIndex(i);
                        setSelectedTitle(t);

                        if (t.title !== originalTitle && t.title !== oldTitle) {
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

            <div className="cbVoteButtonContainer">
                <button className="cbNoticeButton cbVoteButton" 
                    disabled={!Config.config!.activated
                                || currentlySubmitting 
                                || (!selectedThumbnail.current && !selectedTitle) 
                                || (!!selectedTitle && selectedTitle.title.toLowerCase() === chrome.i18n.getMessage("OriginalTitle").toLowerCase())}
                    onClick={async () => {
                        setCurrentlySubmitting(true);

                        props.submitClicked(selectedTitle ? {
                            ...selectedTitle,
                            original: selectedTitle.title === getCurrentPageTitle()
                                        || (!!getCurrentPageTitle() && selectedTitle.title === await toSentenceCase(getCurrentPageTitle()!, false))
                        } : null, selectedThumbnail.current).then((success) => {
                            if (!success) {
                                setCurrentlySubmitting(false);
                            }
                        });
                    }}>
                    {`${chrome.i18n.getMessage("Vote")}`}
                </button>
            </div>

            {
                Config.config!.showGuidelineHelp ? 
                <>
                    <hr className="cbLine"/>

                    <div className="cbHelpContainer">
                        {getTips()}
                    </div>

                    <YourWorkComponent/>

                    <div className="cbHelpButtonContainer">
                        <a className="cbNoticeButton"
                            href="https://wiki.sponsor.ajay.app/w/DeArrow/Guidelines"
                            target="_blank"
                            rel="noreferrer">
                            {`${chrome.i18n.getMessage("Guidelines")}`}
                        </a>

                        <a className="cbNoticeButton"
                            href={`https://chat.sponsor.ajay.app/#${objectToURI("", {
                                displayName: getChatDisplayName(chatDisplayName),
                                customDescription: `${chrome.i18n.getMessage("chatboxDescription")}\n\nhttps://discord.gg/SponsorBlock\nhttps://matrix.to/#/#sponsor:ajay.app?via=matrix.org`,
                                bigDescription: true
                            }, false)}`}
                            target="_blank"
                            rel="noreferrer">
                            {`${chrome.i18n.getMessage("askAQuestion")}`}
                        </a>
                    </div>

                    <LicenseComponent/>
                </>
                : null
            }

            
        </div>
    );
};

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
                timestamp: (t as CustomThumbnailResult).timestamp
            }));

            setExtraUnsubmittedThumbnails(thumbnailsResult);
        }

        const unsubmittedTitles = unsubmitted.titles;
        if (unsubmittedTitles) {
            titlesResult = unsubmittedTitles
                .filter((t) => titles.every((s) => s.title !== t.title))

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
            <span className="cbTipText">{tip.text}</span>
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
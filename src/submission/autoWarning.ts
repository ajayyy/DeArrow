import { objectToURI } from "../../maze-utils/src";
import { getHash } from "../../maze-utils/src/hash";
import Config from "../config/config";
import { getCurrentPageTitle } from "../titles/titleData";
import { cleanEmojis, cleanFancyText, cleanPunctuation, isWordCustomCapitalization } from "../titles/titleFormatter";
import { sendRequestToServer } from "../utils/requests";
import { Tooltip } from "../utils/tooltip";
import { ChatDisplayName, getChatDisplayName } from "./SubmissionComponent";

interface AutoWarningCheck {
    check: (title: string, originalTitle: string) => {
        found: boolean;
        match?: string | null;
    };
    error: string;
    id: string;
}

let activeTooltip: Tooltip | null = null;
let currentWarningId: string | null = null;
let timeout: NodeJS.Timeout | null = null;

const shownWarnings: string[] = [];
const autoWarningChecks: AutoWarningCheck[] = [
    {
        error: chrome.i18n.getMessage("DeArrowStartLowerCaseWarning"),
        check: (title) => {
            return {
                found: !!title.match(/^\p{Ll}\S+ \S+ \S+/u) && !isWordCustomCapitalization(title.split(" ")[0])
            };
        },
        id: "startLowerCase"
    },
    {
        error: chrome.i18n.getMessage("DeArrowDiscussingWarning"),
        check: (title) => {
            const match = title.match(/^(discussing|explaining|talking about|summarizing) .\S+ .\S+/i)?.[1];
            return {
                found: !!match,
                match,
            };
        },
        id: "discussing"
    }, {
        error: chrome.i18n.getMessage("DeArrowEndWithPeriodWarning"),
        check: (title) => {
            return {
                found: !!title.match(/\.$/u)
            };
        },
        id: "endWithPeriod"
    }, {
        error: chrome.i18n.getMessage("DeArrowClickbaitWarning"),
        check: (title, originalTitle) => {
            const regex = /clickbait|fake news|fake video|boring|yapping|yap|worth your time/i;
            const match = title.match(regex)?.[0];
            const found = !!title.match(regex) && !originalTitle.match(regex);

            return {
                found,
                match: found ? match : null,
            };
        },
        id: "clickbait"
    }, {
        error: chrome.i18n.getMessage("DeArrowAddingAnswerWarning"),
        check: (title, originalTitle) => {
            // Only if ends with ? or ... and then optionally more symbols
            const cleaned = cleanPunctuation(cleanFancyText(cleanEmojis(originalTitle.toLowerCase())));
            return {
                found: title.toLowerCase().startsWith(cleaned)
                    && !!originalTitle.match(/(\?|\.\.\.)[^\p{L}]*$/u)
                    && title.trim().length !== cleaned.trim().length
            };
        },
        id: "addingAnswer"
    }, {
        error: chrome.i18n.getMessage("DeArrowKeepingBadOriginalWarning"),
        check: (title, originalTitle) => {
            const regex = /massive problem|you need|insane|crazy|you won't believe this/i;
            const match = title.match(regex)?.[0];
            const found = !!title.match(regex) && !!originalTitle.match(regex);

            return {
                found,
                match: found ? match : null,
            };
        },
        id: "keepingBadOriginal"
    }, {
        error: chrome.i18n.getMessage("DeArrowEmojiWarning"),
        check: (title) => {
            return {
                found: cleanEmojis(title.trim()) !== title.trim()
            };
        },
        id: "emoji"
    }
];

export function getAutoWarning(title: string, originalTitle: string, ignoreShown = false): { id: string; text: string } | null {
    for (const check of autoWarningChecks) {
        const { found, match } = check.check(title, originalTitle);
        if (found && (ignoreShown || !shownWarnings.includes(check.id))) {
            return {
                id: check.id,
                text: check.error + (match ? `\n\n${chrome.i18n.getMessage("DetectedWord")}${match}` : "")
            };
        }
    }

    return null;
}

export function showAutoWarningIfRequired(title: string, element: HTMLElement): void {
    // Wait until some time after typing stops
    if (timeout) {
        clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
        showAutoWarningIfRequiredInternal(title, element);
    }, 500)
}

function showAutoWarningIfRequiredInternal(title: string, element: HTMLElement): void {
    timeout = null;

    const originalTitle = getCurrentPageTitle() || "";
    const warning = getAutoWarning(title, originalTitle);
    if (warning && warning.id !== currentWarningId) {
        activeTooltip?.close();

        currentWarningId = warning.id;
        activeTooltip = new Tooltip({
            textBoxes: warning.text.split("\n"),
            referenceNode: element.parentElement!,
            prependElement: element,
            positionRealtive: false,
            containerAbsolute: true,
            bottomOffset: "35px",
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
                listener: () => {
                    shownWarnings.push(warning.id);
                    activeTooltip?.close();
                    activeTooltip = null;
                    currentWarningId = null;
                }
            }, {
                name: chrome.i18n.getMessage("questionButton"),
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                listener: async () => {
                    const publicUserID = await getHash(Config.config!.userID!);

                    const values = ["userName"];
                    const result = await sendRequestToServer("GET", "/api/userInfo", {
                        publicUserID: publicUserID,
                        values
                    });

                    let name: ChatDisplayName | null = null;

                    if (result.ok) {
                        const userInfo = JSON.parse(result.responseText);
                        name = {
                            publicUserID,
                            username: userInfo.userName
                        };
                    }

                    window.open(`https://chat.sponsor.ajay.app/#${objectToURI("", {
                        displayName: getChatDisplayName(name),
                        customDescription: `${chrome.i18n.getMessage("chatboxDescription")}\n\nhttps://discord.gg/SponsorBlock\nhttps://matrix.to/#/#sponsor:ajay.app?via=matrix.org`,
                        bigDescription: true
                    }, false)}`);
                }
            }],
        });
    } else {
        activeTooltip?.close();
        activeTooltip = null;
        currentWarningId = null;
    }
}

export function resetShownWarnings(): void {
    shownWarnings.length = 0;
    activeTooltip?.close();
    activeTooltip = null;
    currentWarningId = null;
}

export function isAutoWarningShown(): boolean {
    return !!activeTooltip;
}
import { addCleanupListener } from "../../maze-utils/src/cleanup";
import { onMobile } from "../../maze-utils/src/pageInfo";
import { setMediaSessionTitle } from "../videoBranding/mediaSessionHandler";

let targetTitle: string | null = null;
let targetFullTitle = "";


export function setCurrentVideoTitle(title: string) {
    setMediaSessionTitle(title);

    if (title === targetTitle) return;

	const currentTitle = document.querySelector("#title > h1") as HTMLElement | null;
	changePageTitleNow(currentTitle?.innerText || title);
    targetTitle = title;
}

function changePageTitleNow(title: string) {
    if (!onMobile()) {
        const app = document.querySelector("ytd-app");
        if (app) {
            app.dispatchEvent(new CustomEvent("yt-update-title", { detail: title }));
        }
    } else {
        const withoutNotificationValue = document.title.replace(/^\(\d+\)/, "");
        const withoutEndValue = withoutNotificationValue.replace(/-[^-]+$/, "").trim();
        const titleSections = withoutEndValue !== "" 
            ? document.title.split(withoutEndValue) 
            : ["", document.title];

        targetFullTitle = [titleSections[0], title, titleSections[1]]
            .map((s) => s.trim())
            .join(" ")
            .trim();
        document.title = targetFullTitle;

        setupTitleChangeListener();
    }
}

export function setupPageTitleHandler() {
    if (onMobile()) {
        const navigateStartListener = () => {
            targetTitle = null;
        };
        window.addEventListener("state-navigatestart", navigateStartListener);
        
        addCleanupListener(() => {
            window.removeEventListener("state-navigatestart", navigateStartListener);
        });
    }
}

let titleChangeObserver: MutationObserver | null = null;
/**
 * Only used on mobile
 */
function setupTitleChangeListener() {
    if (titleChangeObserver) return;
    const titleElement = document.querySelector("title");
    if (titleElement) {
        titleChangeObserver = new MutationObserver(() => {
            if (targetTitle && document.title !== targetFullTitle) {
                document.title = targetFullTitle;
            }
        });
    
        titleChangeObserver.observe(titleElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    addCleanupListener(() => {
        titleChangeObserver?.disconnect?.();
    });
}

import { isFirefoxOrSafari, waitFor } from "../../maze-utils/src";
import Config from "../config/config";
import { brandingBoxSelector, watchPageThumbnailSelector } from "../videoBranding/videoBranding";
import { logError } from "./logger";
import { getThumbnailElements } from "../../maze-utils/src/thumbnail-selectors";
import { onMobile } from "../../maze-utils/src/pageInfo";

const cssFiles = [
    "content.css",
    "shared.css"
];

export function addCssToPage() {
    const head = document.getElementsByTagName("head")[0] || document.documentElement;

    // Add css related to hiding branding boxes by default
    const style = document.createElement("style");
    style.className = "cb-css";
    style.innerHTML = buildHideThumbnailCss() + buildHideTitleCss();

    head.appendChild(style);

    const onLoad = async () => {
        await waitFor(() => Config.isReady());

        const head = document.getElementsByTagName("head")[0];
        if (!isFirefoxOrSafari() && Config.config!.invidiousInstances?.includes(new URL(document.URL).host)) {
            for (const file of cssFiles) {
                const fileref = document.createElement("link");
                fileref.className = "cb-css";
                fileref.rel = "stylesheet";
                fileref.type = "text/css";
                fileref.href = chrome.runtime.getURL(file);

                head.appendChild(fileref);
            }
        }

        if (onMobile()) {
            setTimeout(() => injectMobileCss(), 200);
        }
    };
    

    if (document.readyState === "complete") {
        onLoad().catch(logError);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.addEventListener("DOMContentLoaded", onLoad);
    }

    waitFor(() => Config.isReady()).then(() => addMaxTitleLinesCssToPage()).catch(logError);
}

export function addMaxTitleLinesCssToPage() {
    const head = document.getElementsByTagName("head")[0] || document.documentElement;

    const existingStyle = document.querySelector(".cb-title-lines");
    if (existingStyle) {
        existingStyle.remove();
    }

    const style = document.createElement("style");
    style.className = "cb-title-lines";
    style.innerHTML = buildMaxLinesTitleCss();

    head.appendChild(style);
}

function buildHideThumbnailCss(): string {
    const result: string[] = [
        ".ytp-ce-covering-image:not(.cb-visible)", // Endcards
        "div.ytp-autonav-endscreen-upnext-thumbnail:not(.cb-visible)", // Autoplay
        "div.ytp-videowall-still-image:not(.cb-visible)" // End recommendations
    ];

    const boxesToHide = brandingBoxSelector.split(", ").concat([
        "ytd-video-preview"
    ]);
    for (const start of boxesToHide) {
        const thumbnailTypes = getThumbnailElements();

        for (const thumbnailType of thumbnailTypes) {
            result.push(`${start} ${thumbnailType} img:not(.cb-visible, ytd-moving-thumbnail-renderer img, .cbCustomThumbnailCanvas, .yt-spec-avatar-shape__image, .cbShowOriginalImage)`);
        }
    }

    result.push(`${watchPageThumbnailSelector} div:not(.cb-visible, .cbLiveCover)`);

    return `${result.join(", ")} { visibility: hidden !important; }\n`;
}

function buildHideTitleCss(): string {
    const result: string[] = [];
    for (const start of brandingBoxSelector.split(", ")) {
        if (!onMobile()) {
            // Fix smaller titles in playlists on search pages from being hidden
            // https://github.com/ajayyy/DeArrow/issues/162
            const extra = start === "ytd-playlist-renderer" ? " a.ytd-playlist-renderer" : "";

            result.push(`${start}${extra} #video-title:not(.cbCustomTitle)`);
        } else {
            result.push(`${start} .media-item-headline .yt-core-attributed-string:not(.cbCustomTitle)`);
        }
    }

    if (onMobile()) {
        result.push(".compact-media-item-headline .yt-core-attributed-string:not(.cbCustomTitle)");
    }

    return `${result.join(", ")} { display: none !important; }\n`;
}

function buildMaxLinesTitleCss(): string {
    // For safety, ensure nothing can be injected
    if (typeof (Config.config!.titleMaxLines) !== "number" || onMobile()) return "";

    const result: string[] = [];
    for (const start of brandingBoxSelector.split(", ")) {
        if (!onMobile()) {
            // .ta-title-container for compatibility with Tube Archivist
            result.push(`${start} #video-title:not(.ta-title-container)`);
            result.push(`${start} .yt-lockup-metadata-view-model-wiz__title > .yt-core-attributed-string:not(.ta-title-container)`);
        }
    }

    return `${result.join(", ")} { -webkit-line-clamp: ${Config.config!.titleMaxLines} !important; max-height: unset !important; }\n`;
}

function injectMobileCss() {
    const head = document.getElementsByTagName("head")[0];

    const style = document.createElement("style");
    style.className = "cb-mobile-css";
    style.innerHTML = buildMobileCss();

    head.appendChild(style);
}

function buildMobileCss(): string {
    if (!onMobile()) return "";

    const html = document.getElementsByTagName("html")[0];
    if (html) {
        const style = window.getComputedStyle(html);
        if (style) {
            const color = style.getPropertyValue("color");
            return `
                :root {
                    --yt-spec-text-primary: ${color};
                }
            `;
        }
    }

    return "";
}

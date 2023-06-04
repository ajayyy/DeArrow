import { isFirefoxOrSafari, waitFor } from "@ajayyy/maze-utils";
import Config from "../config";
import { brandingBoxSelector, watchPageThumbnailSelector } from "../videoBranding/videoBranding";

const cssFiles = [
    "content.css"
];

export function addCssToPage() {
    const head = document.getElementsByTagName("head")[0] || document.documentElement;

    // Add css related to hiding branding boxes by default
    const style = document.createElement("style");
    style.innerHTML = buildHideThumbnailCss() + buildHideTitleCss();

    head.appendChild(style);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.addEventListener("DOMContentLoaded", async () => {
        await waitFor(() => Config.isReady());

        const head = document.getElementsByTagName("head")[0];
        if (!isFirefoxOrSafari() && Config.config!.invidiousInstances.includes(new URL(document.URL).host)) {
            for (const file of cssFiles) {
                const fileref = document.createElement("link");
                fileref.rel = "stylesheet";
                fileref.type = "text/css";
                fileref.href = chrome.extension.getURL(file);

                head.appendChild(fileref);
            }
        }
    });
}

function buildHideThumbnailCss(): string {
    const result: string[] = [
        ".ytp-ce-covering-image:not(.cb-visible)", // Endcards
        "div.ytp-autonav-endscreen-upnext-thumbnail:not(.cb-visible)", // Autoplay
        "div.ytp-videowall-still-image:not(.cb-visible)" // End recommendations
    ];

    for (const start of brandingBoxSelector.split(", ")) {
        const thumbnailTypes = [
            "ytd-thumbnail",
            "ytd-playlist-video-thumbnail-renderer"
        ];

        for (const thumbnailType of thumbnailTypes) {
            result.push(`${start} ${thumbnailType} img:not(.cb-visible)`);
        }
    }

    result.push(`${watchPageThumbnailSelector} div:not(.cb-visible)`);

    return `${result.join(", ")} { visibility: hidden !important; }\n`;
}

function buildHideTitleCss(): string {
    const result: string[] = [];
    for (const start of brandingBoxSelector.split(", ")) {
        result.push(`${start} #video-title:not(.cbCustomTitle)`);
    }

    return `${result.join(", ")} { display: none !important; }\n`;
}
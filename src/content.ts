import { startThumbnailListener } from "./videoBranding/videoBranding";
import { setupCBVideoModule } from "./video";

setupCBVideoModule();

// Direct Links after the config is loaded
// utils.wait(() => Config.config !== null, 1000, 1).then(() => videoIDChange(getYouTubeVideoID(document)));
// utils.waitForElement("a.ytp-title-link[data-sessionlink='feature=player-title']")
//     .then(() => videoIDChange(getYouTubeVideoID(document)));

// let currentVideoID: VideoID | null = null;

startThumbnailListener();

// function resetValues(): void {
//     currentVideoID = null;
// }

// function videoIDChange(id: VideoID): void {
//     if (id === currentVideoID) return;

//     resetValues();
//     currentVideoID = id;
//     if (!id) return;
// }

//todo: start with adding the visual element

// // TODO: move this to shared lib
// function getYouTubeVideoID(document: Document, url?: string): string | null {
//     url ||= document.URL;
//     // pageType shortcut
//     if (pageType === PageType.Channel) return getYouTubeVideoIDFromDocument();
//     // clips should never skip, going from clip to full video has no indications.
//     if (url.includes("youtube.com/clip/")) return null;
//     // skip to document and don't hide if on /embed/
//     if (url.includes("/embed/") && url.includes("youtube.com")) return getYouTubeVideoIDFromDocument(false, PageType.Embed);
//     // skip to URL if matches youtube watch or invidious or matches youtube pattern
//     if ((!url.includes("youtube.com")) || url.includes("/watch") || url.includes("/shorts/") || url.includes("playlist")) return getYouTubeVideoIDFromURL(url);
//     // skip to document if matches pattern
//     if (url.includes("/channel/") || url.includes("/user/") || url.includes("/c/")) return getYouTubeVideoIDFromDocument(true, PageType.Channel);
//     // not sure, try URL then document
//     return getYouTubeVideoIDFromURL(url) || getYouTubeVideoIDFromDocument(false);
// }

// function getYouTubeVideoIDFromDocument(hideIcon = true, pageHint = PageType.Watch): string | null {
//     const selector = "a.ytp-title-link[data-sessionlink='feature=player-title']";
//     // get ID from document (channel trailer / embedded playlist)
//     const element = pageHint === PageType.Embed ? document.querySelector(selector)
//         : video?.parentElement?.parentElement?.querySelector(selector);
//     const videoURL = element?.getAttribute("href");
//     if (videoURL) {
//         onInvidious = hideIcon;
//         // if href found, hint was correct
//         pageType = pageHint;
//         return getYouTubeVideoIDFromURL(videoURL);
//     } else {
//         return null;
//     }
// }

// function getYouTubeVideoIDFromURL(url: string): string | null {
//     if(url.startsWith("https://www.youtube.com/tv#/")) url = url.replace("#", "");

//     //Attempt to parse url
//     let urlObject: URL = null;
//     try {
//         urlObject = new URL(url);
//     } catch (e) {
//         console.error("[SB] Unable to parse URL: " + url);
//         return null;
//     }

//     // Check if valid hostname
//     if (Config.config && Config.config.invidiousInstances.includes(urlObject.host)) {
//         onInvidious = true;
//     } else if (urlObject.host === "m.youtube.com") {
//         onMobileYouTube = true;
//     } else if (!["m.youtube.com", "www.youtube.com", "www.youtube-nocookie.com", "music.youtube.com"].includes(urlObject.host)) {
//         if (!Config.config) {
//             // Call this later, in case this is an Invidious tab
//             utils.wait(() => Config.config !== null).then(() => videoIDChange(getYouTubeVideoIDFromURL(url)));
//         }

//         return null;
//     } else {
//         onInvidious = false;
//     }

//     //Get ID from searchParam
//     if (urlObject.searchParams.has("v") && ["/watch", "/watch/"].includes(urlObject.pathname) || urlObject.pathname.startsWith("/tv/watch")) {
//         const id = urlObject.searchParams.get("v");
//         return id.length == 11 ? id : null;
//     } else if (urlObject.pathname.startsWith("/embed/") || urlObject.pathname.startsWith("/shorts/")) {
//         try {
//             const id = urlObject.pathname.split("/")[2]
//             if (id?.length >=11 ) return id.slice(0, 11);
//         } catch (e) {
//             console.error("[SB] Video ID not valid for " + url);
//             return null;
//         }
//     }
//     return null;
// }
export const shortsTitleSelector = "ytd-video-description-header-renderer #shorts-title";

export function isYouTubeShortsPage(url: string): boolean {
    const segments = new URL(url).pathname.split("/");
    return segments[1] === "shorts" && Boolean(segments[2]);
}

export function getYouTubeTitleSelectorWithShorts(baseSelector: string): string {
    return `${baseSelector}, ${shortsTitleSelector}`;
}

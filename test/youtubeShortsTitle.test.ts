import { getYouTubeTitleSelectorWithShorts, isYouTubeShortsPage, shortsTitleSelector } from "../src/utils/youtubeShortsTitle";

describe("YouTube Shorts title support", () => {
    it("recognizes Shorts video URLs as video detail pages", () => {
        expect(isYouTubeShortsPage("https://www.youtube.com/shorts/synthetic-id")).toBe(true);
        expect(isYouTubeShortsPage("https://www.youtube.com/watch?v=synthetic-id")).toBe(false);
        expect(isYouTubeShortsPage("https://www.youtube.com/shorts/synthetic-id/")).toBe(true);
        expect(isYouTubeShortsPage("https://www.youtube.com/shorts/")).toBe(false);
    });

    it("keeps the pinned shared title selectors and adds the Shorts title node", () => {
        const baseSelector = "#title h1, .ytd-video-primary-info-renderer.title";

        expect(getYouTubeTitleSelectorWithShorts(baseSelector)).toBe(`${baseSelector}, ${shortsTitleSelector}`);
    });
});

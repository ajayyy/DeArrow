import { sendRequestToCustomServer } from "../../maze-utils/src/background-request-proxy";
import { DataCache } from "../../maze-utils/src/cache";
import { VideoID } from "../../maze-utils/src/video";

interface AntiTranslateData {
    title: string;
}

const titleAntiTranslateCache = new DataCache<VideoID, AntiTranslateData>(() => ({
    title: ""
}));

export async function getAntiTranslatedTitle(videoID: VideoID): Promise<string | null> {
    const cache = titleAntiTranslateCache.getFromCache(videoID);

    if (cache) {
        titleAntiTranslateCache.cacheUsed(videoID);
        return cache.title;
    }

    const title = await getAntiTranslatedTitleFromServer(videoID);
    if (title) {
        titleAntiTranslateCache.setupCache(videoID).title = title;
    }

    return title;
}

async function getAntiTranslatedTitleFromServer(videoID: VideoID): Promise<string | null> {
    const response = await sendRequestToCustomServer("GET", `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoID}`);

    if (response.ok) {
        try {
            const json = JSON.parse(response.responseText);
            if (json.title) {
                return json.title;
            }
        } catch (e) {} // eslint-disable-line no-empty
    }

    return null;
}
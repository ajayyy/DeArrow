import { getPlaybackUrl } from "./thumbnailData";
import { getFromCache, RenderedThumbnailVideo, setupCache } from "./thumbnailDataCache";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { getVideoThumbnailIncludingUnsubmitted } from "../dataFetching";
import { logError } from "../utils/logger";

export async function renderThumbnail(videoID: VideoID, width: number,
    height: number, saveVideo: boolean, timestamp: number): Promise<RenderedThumbnailVideo | null> {
    const start = Date.now();

    const existingCache = getFromCache(videoID);
    if (existingCache && existingCache?.video?.length > 0) {
        const bestVideo = (width && height) ? existingCache.video.find(v => v.width >= width && v.height >= height && timestamp === v.timestamp)
            : existingCache.video[existingCache.video.length - 1];

        if (bestVideo?.rendered) {
            return bestVideo;
        } else if (bestVideo) {
            await new Promise((resolve) => {
                bestVideo?.onReady.push(resolve);
            });
        }
    }

    let url = await getPlaybackUrl(videoID, width, height);
    if (!url) return null; //todo: handle null url, example: byXHW0dvu2U

    let video = createVideo(url, timestamp);
    let tries = 1;
    const videoCache = setupCache(videoID);
    videoCache.video.push({
        video: video,
        width: width,
        height: height,
        rendered: false,
        onReady: [],
        timestamp
    });

    return new Promise((resolve, reject) => {
        let resolved = false;

        const loadedData = () => {
            const betterVideo = getFromCache(videoID)?.video?.find(v => v.width >= width && v.height >= height
                && v.timestamp === timestamp && v.rendered);
            if (betterVideo) {
                video.remove();
                resolved = true;

                reject("Already rendered");
                return;
            }

            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")?.drawImage(video, 0, 0);

            const videoInfo: RenderedThumbnailVideo = {
                canvas,
                video: saveVideo ? video : null,
                width: video.videoWidth,
                height: video.videoHeight,
                rendered: true,
                onReady: [],
                timestamp
            };

            const videoCache = setupCache(videoID);
            const currentVideoInfoIndex = videoCache.video.findIndex(v => v.width === video.videoWidth
                && v.height === video.videoHeight && v.timestamp === timestamp);
            const currentVideoInfo = currentVideoInfoIndex !== -1 ? videoCache.video[currentVideoInfoIndex] : null;
            if (currentVideoInfo) {
                for (const callback of currentVideoInfo.onReady) {
                    callback(videoInfo);
                }

                videoCache.video[currentVideoInfoIndex] = videoInfo;
            } else {
                videoCache.video.push(videoInfo);
            }

            console.log(videoID, (Date.now() - start) / 1000, width > 0 ? "full" : "smaller");

            if (!saveVideo) video.remove();

            resolved = true;
            resolve(videoInfo);
        };

        const errorHandler = async () => {
            if (!resolved) {
                // Try creating the video again
                video.remove();

                if (tries++ > 5) {
                    // Give up
                    const videoCache = getFromCache(videoID);
                    if (videoCache?.video) {
                        videoCache.video = videoCache.video.filter(v => v.width !== width && v.height !== height && v.timestamp !== timestamp);
                    }

                    console.error(`Failed to render thumbnail for ${videoID} after ${tries} tries`);
                    return;
                }

                url = await getPlaybackUrl(videoID, width, height, true);
                if (!url) {
                    resolve(null);
                    return;
                }

                const videoCache = setupCache(videoID);
                const index = videoCache.video.findIndex(v => v.width === width && v.height === height
                    && v.timestamp === timestamp);
                if (index !== -1) {
                    videoCache.video[index].video = video;
                } else {
                    videoCache.video.push({
                        video: video,
                        width: width,
                        height: height,
                        rendered: false,
                        onReady: [],
                        timestamp
                    });
                }

                video = createVideo(url, timestamp);
                video.addEventListener("loadeddata", loadedData);
                video.addEventListener("error", () => void errorHandler());
            }
        };

        video.addEventListener("error", () => void errorHandler());
        video.addEventListener("loadeddata", loadedData);
    })
}

/**
 * Returns a canvas that will be drawn to once the thumbnail is ready.
 * 
 * Starts with lower resolution and replaces it with higher resolution when ready.
 */
export async function createThumbnailCanvas(videoID: VideoID, width: number,
    height: number, forcedTimestamp: number | null, saveVideo: boolean, ready: () => unknown): Promise<HTMLCanvasElement | null> {
    const urls = await getPlaybackUrl(videoID, width, height);
    if (!urls) return null;

    let timestamp = forcedTimestamp as number;
    if (timestamp === null) {
        const thumbnail = await getVideoThumbnailIncludingUnsubmitted(videoID, false);
        if (thumbnail && !thumbnail.original) {
            timestamp = thumbnail.timestamp;
        } else {
            // Original thumbnail will be shown automatically
            return null;
        }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = "none";

    renderThumbnail(videoID, 0, 0, saveVideo, timestamp).then((smallerCanvasInfo) => {
        if (!smallerCanvasInfo || smallerCanvasInfo.width < width || smallerCanvasInfo.height < height) {

            // Try to generate a larger one too and replace it when ready
            // todo: use a better metric than a fixed delay, count number of loading items and use a priority system
            setTimeout(() => {
                renderThumbnail(videoID, width, height, saveVideo, timestamp).then((largerCanvasInfo) => {
                    if (!largerCanvasInfo) return;

                    drawCentered(canvas, width, height, largerCanvasInfo.width, largerCanvasInfo.height, largerCanvasInfo.canvas);
                    if (!smallerCanvasInfo) ready();
                }).catch(() => { }); //eslint-disable-line @typescript-eslint/no-empty-function
            }, 6000);


            if (!smallerCanvasInfo) return;
        }

        drawCentered(canvas, width, height, smallerCanvasInfo.width, smallerCanvasInfo.height, smallerCanvasInfo.canvas);
        ready();
    }).catch(() => { }); //eslint-disable-line @typescript-eslint/no-empty-function

    return canvas;
}

export function drawCentered(canvas: HTMLCanvasElement, width: number, height: number,
    originalWidth: number, originalHeight: number, originalSurface: HTMLVideoElement | HTMLCanvasElement): void {
    const calculateWidth = height * originalWidth / originalHeight;
    canvas.getContext("2d")?.drawImage(originalSurface, (width - calculateWidth) / 2, 0, calculateWidth, height);
}

function createVideo(url: string, timestamp: number): HTMLVideoElement {
    const video = document.createElement("video");
    video.src = url;
    video.currentTime = timestamp;
    video.controls = false;
    video.pause();
    video.volume = 0;

    return video;
}

export async function replaceThumbnail(element: HTMLElement, videoID: VideoID, timestamp?: number): Promise<boolean> {
    const image = element.querySelector(".ytd-thumbnail img") as HTMLImageElement;

    if (image) {
        const width = 720;
        const height = 404;

        // TODO: Add option not to hide all thumbnails by default
        image.style.display = "none";

        // Trigger a fetch to start, and display the original thumbnail if necessary
        getVideoThumbnailIncludingUnsubmitted(videoID, false).then((thumbnail) => {
            if (thumbnail && thumbnail.original) {
                image.style.setProperty("display", "block", "important");
            }
        }).catch(logError);

        const thumbnail = await createThumbnailCanvas(videoID, width, height, timestamp ?? null, false, () => {
            thumbnail!.style.removeProperty("display");
        });

        if (!thumbnail) {
            image.style.removeProperty("display");
            return false;
        }

        image.style.display = "none";
        thumbnail.classList.add("style-scope");
        thumbnail.classList.add("ytd-img-shadow");
        image.parentElement?.appendChild(thumbnail);
    }

    return !!image;
}
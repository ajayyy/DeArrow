import { Format, getPlaybackFormats } from "./thumbnailData";
import { getFromCache, RenderedThumbnailVideo, setupCache, ThumbnailVideo } from "./thumbnailDataCache";
import { VideoID } from "@ajayyy/maze-utils/lib/video";
import { getVideoThumbnailIncludingUnsubmitted, isFetchingFromThumbnailCache, queueThumbnailCacheRequest, waitForThumbnailCache } from "../dataFetching";
import { log, logError } from "../utils/logger";
import { BrandingLocation } from "../videoBranding/videoBranding";
import { isFirefoxOrSafari, timeoutPomise, waitFor } from "@ajayyy/maze-utils";
import Config, { ThumbnailFallbackOption } from "../config/config";
import { getThumbnailFallbackOption, shouldReplaceThumbnails, shouldReplaceThumbnailsFastCheck } from "../config/channelOverrides";

const thumbnailRendererControls: Record<VideoID, Array<(error?: string) => void>> = {};

function stopRendering(videoID: VideoID, error?: string) {
    const control = thumbnailRendererControls[videoID];
    if (control) {
        for (const callback of control) {
            callback(error);
        }
    }

    delete thumbnailRendererControls[videoID];
}

function addStopRenderingCallback(videoID: VideoID, callback: (error?: string) => void) {
    thumbnailRendererControls[videoID] ??= [];
    thumbnailRendererControls[videoID].push(callback);
}

export function renderThumbnail(videoID: VideoID, width: number,
    height: number, saveVideo: boolean, timestamp: number): Promise<RenderedThumbnailVideo | null> {
    const existingCache = getFromCache(videoID);
    let reusedVideo: HTMLVideoElement | null = null;
    if (existingCache && existingCache?.video?.length > 0) {
        const bestVideos = ((width && height) ? existingCache.video.filter(v => (v.rendered && v.fromThumbnailCache)
                || (v.width >= width && v.height >= height))
            : existingCache.video).sort((a, b) => b.width - a.width).sort((a, b) => +b.rendered - +a.rendered);

        const sameTimestamp = bestVideos.find(v => v.timestamp === timestamp);

        if (sameTimestamp?.rendered) {
            return Promise.resolve(sameTimestamp);
        } else if (sameTimestamp) {
            return new Promise((resolve) => {
                sameTimestamp.onReady.push((a) => {
                    resolve(a)
                });
            });
        } else if (bestVideos.length > 0) {
            reusedVideo = bestVideos[0].video;
        }
    }

    // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
    return new Promise(async (resolve, reject) => {
        const start = Date.now();
        const stopCallbackHandler = new Promise<string | undefined>((resolve) => {
            addStopRenderingCallback(videoID, resolve);
        });
        let format = await Promise.race([getPlaybackFormats(videoID, width, height), stopCallbackHandler]);
        const videoCache = setupCache(videoID);
        if (!format || !(format as Format)?.url) {
            handleThumbnailRenderFailure(videoID, width, height, timestamp, resolve);
            return;
        }
        if (typeof(format) === "string") {
            resolve(videoCache.video.find(v => v.timestamp === timestamp && v.rendered && v.fromThumbnailCache) as RenderedThumbnailVideo ?? null);
            return;
        }
        
        let video = createVideo(reusedVideo, format.url, timestamp);
        let tries = 1;
        let videoCacheObject: ThumbnailVideo = {
            video: video,
            width: format.width,
            height: format.height,
            rendered: false,
            onReady: [resolve],
            timestamp
        };
        videoCache.video.push(videoCacheObject);

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

            log(videoID, "videoLoaded", video.currentTime, video.readyState, video.seeking, format)
            if (video.readyState < 2 || video.seeking) {
                setTimeout(loadedData, 50);
                return;
            }
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")!.drawImage(video, 0, 0);

            const videoInfo: RenderedThumbnailVideo = {
                canvas,
                video: saveVideo ? video : null,
                width: video.videoWidth,
                height: video.videoHeight,
                rendered: true,
                onReady: [],
                timestamp,
                fromThumbnailCache: false
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

            log(videoID, (Date.now() - start) / 1000, width > 0 ? "full" : "smaller");

            // Remove this first to not trigger error when changing video src
            video.removeEventListener("error", errorHandler);
            if (!saveVideo) {
                video.src = "";
                video.remove();
            } else {
                video.removeEventListener("loadeddata", loadedData);
                video.removeEventListener("seeked", loadedData)
            }

            resolved = true;
        };

        const errorHandler = () => void (async () => {
            if (!resolved) {
                // Try creating the video again
                video.remove();

                if (tries++ > 5) {
                    // Give up
                    handleThumbnailRenderFailure(videoID, width, height, timestamp, resolve);
                    return;
                }

                // New format variable being used for casting reasons
                const newFormat = await getPlaybackFormats(videoID, width, height, true);
                format = newFormat;
                if (format === null) {
                    for (const callback of videoCacheObject.onReady) {
                        callback(null);
                    }

                    resolved = true;
                    return;
                }

                const videoCache = setupCache(videoID);
                const index = videoCache.video.findIndex(v => v.width === newFormat?.width 
                    && v.height === newFormat?.height && v.timestamp === timestamp);
                if (index !== -1) {
                    videoCache.video[index].video = video;
                } else {
                    videoCacheObject = {
                        video: video,
                        width: format?.width,
                        height: format?.height,
                        rendered: false,
                        onReady: [resolve],
                        timestamp
                    };

                    videoCache.video.push(videoCacheObject);
                }

                video = createVideo(null, format?.url, timestamp);
                video.addEventListener("loadeddata", loadedData);
                video.addEventListener("error", errorHandler);
            }
        })();

        video.addEventListener("error", errorHandler);
        if (reusedVideo) {
            video.addEventListener("seeked", loadedData);
        } else {
            video.addEventListener("loadeddata", loadedData);
        }

        // Give up after some times
        setTimeout(() => {
            if (!resolved) {
                errorHandler();
            }
        }, Config.config!.renderTimeout);

        addStopRenderingCallback(videoID, () => {
            video.removeEventListener("loadeddata", loadedData);
            video.removeEventListener("seeked", loadedData)
            video.removeEventListener("error", errorHandler);

            video.src = "";
            video.remove();

            reject("Stopped while waiting for video to load");
        });
    });
}

function handleThumbnailRenderFailure(videoID: VideoID, width: number, height: number,
        timestamp: number, resolve: (video: RenderedThumbnailVideo | null) => void): void {
    const videoCache = setupCache(videoID);
    const thumbnailFailed = !!videoCache.thumbnailCachesFailed?.has?.(timestamp);
    const listeners = [resolve];

    if (videoCache.video) {
        const filter = v => v.width !== width && v.height !== height && v.timestamp !== timestamp;
        const removedItems = videoCache.video.filter((v) => !filter(v));
        videoCache.video = videoCache.video.filter(filter);

        listeners.push(...removedItems.flatMap((v) => v.onReady));
    }

    if (!thumbnailFailed) {
        // Force the thumbnail to be generated by the server
        queueThumbnailCacheRequest(videoID, timestamp, undefined, false, true);

        videoCache.failures.push({
            timestamp,
            onReady: [...listeners]
        });
    } else {
        for (const callback of listeners) {
            callback(null);
        }
    }
}

/**
 * Returns a canvas that will be drawn to once the thumbnail is ready.
 * 
 * Starts with lower resolution and replaces it with higher resolution when ready.
 */
export async function createThumbnailCanvas(existingCanvas: HTMLCanvasElement | null, videoID: VideoID, width: number,
    height: number, brandingLocation: BrandingLocation, forcedTimestamp: number | null,
    saveVideo: boolean, ready: (canvas: HTMLCanvasElement) => unknown, failure: () => unknown): Promise<HTMLCanvasElement | null> {

    let timestamp = forcedTimestamp as number;
    if (timestamp === null) {
        try {
            const thumbnail = await getVideoThumbnailIncludingUnsubmitted(videoID, brandingLocation);
            if (thumbnail && !thumbnail.original) {
                timestamp = thumbnail.timestamp;
            } else {
                // Original thumbnail will be shown automatically
                return null;
            }
        } catch (e) {
            return null;
        }
    }

    if (isFetchingFromThumbnailCache(videoID, timestamp)) {
        // Wait for the thumbnail to be fetched from the cache before trying local generation
        try {
            await Promise.race([
                waitForThumbnailCache(videoID),
                timeoutPomise(Config.config!.startLocalRenderTimeout)
            ]);
        } catch (e) {
            // Go on and do a local render
        }
    }

    const canvas = existingCanvas ?? document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = "none";

    const result = (canvasInfo: RenderedThumbnailVideo | null) => {
        if (!canvasInfo) {
            failure();
            return;
        }

        drawCentered(canvas, width, height, canvasInfo.width, canvasInfo.height, canvasInfo.canvas);
        ready(canvas);
    }

    renderThumbnail(videoID, width, height, saveVideo, timestamp).then(result).catch(() => {
        // Try again with lower resolution
        renderThumbnail(videoID, 0, 0, saveVideo, timestamp).then(result).catch(() => {
            logError(`Failed to render thumbnail for ${videoID}`);
        });
    });

    return canvas;
}

export function drawCentered(canvas: HTMLCanvasElement, width: number, height: number,
    originalWidth: number, originalHeight: number, originalSurface: HTMLVideoElement | HTMLCanvasElement): void {
    const calculateWidth = height * originalWidth / originalHeight;
    const context = canvas.getContext("2d")!;
    
    if (Config.config!.antiAliasThumbnails 
            && (originalSurface.width !== width || originalSurface.height !== height)) {
        originalSurface = runAntiAliasShrink(originalSurface, width, height);
        context.imageSmoothingEnabled = true;
    }

    context.drawImage(originalSurface, (width - calculateWidth) / 2, 0, calculateWidth, height);
}

function runAntiAliasShrink(originalSurface: HTMLVideoElement | HTMLCanvasElement,
        width: number, height: number): HTMLVideoElement | HTMLCanvasElement {
    while (originalSurface.width > width * 2 && originalSurface.height > height * 2) {
        const newCanvas = document.createElement("canvas");
        newCanvas.width = originalSurface.width / 1.5;
        newCanvas.height = originalSurface.height / 1.5;
        const newContext = newCanvas.getContext("2d")!;
        newContext.imageSmoothingEnabled = true;
        newContext.drawImage(originalSurface, 0, 0, newCanvas.width, newCanvas.height);

        originalSurface = newCanvas;
    }

    return originalSurface;
}

function createVideo(existingVideo: HTMLVideoElement | null, url: string, timestamp: number): HTMLVideoElement {
    if (timestamp === 0 && !isFirefoxOrSafari()) timestamp += 0.001;
    
    const video = existingVideo ?? document.createElement("video");
    // https://stackoverflow.com/a/69074004
    if (!existingVideo) video.src = `${url}#t=${timestamp}-${timestamp + 0.001}`;
    video.currentTime = timestamp;
    video.controls = false;
    video.pause();
    video.volume = 0;

    return video;
}

function getThumbnailSelector(brandingLocation: BrandingLocation): string {
    switch (brandingLocation) {
        case BrandingLocation.Related:
            return "ytd-thumbnail:not([hidden]) img, ytd-playlist-thumbnail yt-image:not(.blurred-image) img";
        case BrandingLocation.Endcards:
            return ".ytp-ce-covering-image";
        case BrandingLocation.Autoplay:
            return "div.ytp-autonav-endscreen-upnext-thumbnail";
        case BrandingLocation.EndRecommendations:
            return "div.ytp-videowall-still-image";
        case BrandingLocation.Watch:
            return ".ytp-cued-thumbnail-overlay-image";
        default:
            throw new Error("Invalid branding location");
    }
}

function getThumbnailBox(image: HTMLElement, brandingLocation: BrandingLocation): HTMLElement {
    switch (brandingLocation) {
        case BrandingLocation.Related:
            return image.closest("ytd-thumbnail:not([hidden]), ytd-playlist-thumbnail") as HTMLElement;
        case BrandingLocation.Autoplay:
            return image;
        default:
            return image.parentElement!;
    }
}

export async function replaceThumbnail(element: HTMLElement, videoID: VideoID, brandingLocation: BrandingLocation,
        showCustomBranding: boolean, timestamp?: number): Promise<boolean> {
    const image = element.querySelector(getThumbnailSelector(brandingLocation)) as HTMLImageElement;
    const box = getThumbnailBox(image, brandingLocation);

    if (!showCustomBranding || shouldReplaceThumbnailsFastCheck(videoID) === false) {
        resetToShowOriginalThumbnail(image, brandingLocation);

        if (await shouldReplaceThumbnails(videoID)) {
            // Still check if the thumbnail is supposed to be changed or not
            const thumbnail = await getVideoThumbnailIncludingUnsubmitted(videoID, brandingLocation);
            return !!thumbnail && !thumbnail.original;
        } else {
            return false;
        }
    }

    if (image && box) {
        let objectWidth = box.offsetWidth;
        let objectHeight = box.offsetHeight;
        if (objectWidth === 0 || objectHeight === 0) {
            const style = window.getComputedStyle(box);
            objectWidth = parseInt(style.getPropertyValue("width").replace("px", ""), 10);
            objectHeight = parseInt(style.getPropertyValue("height").replace("px", ""), 10);

            if (objectWidth === 0) {
                try {
                    await waitFor(() => box.offsetWidth > 0 && box.offsetHeight > 0);
                } catch (e) {
                    // No need to render this thumbnail since it is hidden
                    return false;
                }
            }
        }

        const width = objectWidth * window.devicePixelRatio;
        const height = objectHeight * window.devicePixelRatio;

        // TODO: Add option not to hide all thumbnails by default
        image.style.display = "none";
        image.classList.remove("cb-visible");

        // Trigger a fetch to start, and display the original thumbnail if necessary
        getVideoThumbnailIncludingUnsubmitted(videoID, brandingLocation).then(async (thumbnail) => {
            if (!thumbnail || thumbnail.original) {
                if (!thumbnail && await getThumbnailFallbackOption(videoID) === ThumbnailFallbackOption.Blank) {
                    resetToBlankThumbnail(image);
                } else {
                    resetToShowOriginalThumbnail(image, brandingLocation);
                }
            }
        }).catch(logError);

        const existingCanvas = image.parentElement?.querySelector(".cbCustomThumbnailCanvas") as HTMLCanvasElement | null;

        try {
            const thumbnail = await createThumbnailCanvas(existingCanvas, videoID, width, height, brandingLocation, timestamp ?? null, false, (thumbnail) => {
                thumbnail!.style.removeProperty("display");

                if (brandingLocation === BrandingLocation.Related) {
                    box.setAttribute("loaded", "");
                }
            }, () => resetToShowOriginalThumbnail(image, brandingLocation));
    
            if (!thumbnail) {
                // Hiding handled by already above then check
                return false;
            }

            // Waiting until now so that innertube has time to fetch data
            if (!await shouldReplaceThumbnails(videoID)) {
                resetToShowOriginalThumbnail(image, brandingLocation);

                return false;
            }

            image.style.display = "none";
            image.classList.remove("cb-visible");
            thumbnail.classList.add("style-scope");
            thumbnail.classList.add("ytd-img-shadow");
            thumbnail.classList.add("cbCustomThumbnailCanvas");
            thumbnail.style.removeProperty("display");

            if (brandingLocation === BrandingLocation.EndRecommendations) {
                thumbnail.classList.add("ytp-videowall-still-image");
            } else if (brandingLocation === BrandingLocation.Autoplay) {
                thumbnail.classList.add("ytp-autonav-endscreen-upnext-thumbnail");
            }

            thumbnail.style.height = "100%";
            if (brandingLocation === BrandingLocation.Autoplay) {
                // For autoplay, the thumbnail is placed inside the image div, which has the image as the background image
                // This is because hiding the entire div would hide the video duration
                image.prepend(thumbnail);
                image.style.removeProperty("display");
                image.classList.add("cb-visible");
            } else {
                image.parentElement?.appendChild?.(thumbnail);
            }
        } catch (e) {
            logError(e);

            resetToShowOriginalThumbnail(image, brandingLocation);
            return false;
        }
    }

    return !!image;
}

function resetToShowOriginalThumbnail(image: HTMLImageElement, brandingLocation: BrandingLocation) {
    image.classList.add("cb-visible");
    image.style.removeProperty("display");

    if (brandingLocation === BrandingLocation.Autoplay
            || !!image.closest("ytd-grid-playlist-renderer")) {
        hideCanvas(image);
    }
}

function resetToBlankThumbnail(image: HTMLImageElement) {
    image.classList.remove("cb-visible");
    image.style.setProperty("display", "none", "important");

    hideCanvas(image);
}

function hideCanvas(image: HTMLElement) {
    const canvas = image.parentElement?.querySelector(".cbCustomThumbnailCanvas") as HTMLCanvasElement | null;
    if (canvas) {
        canvas.style.display = "none";
    }
}

export async function setupPreRenderedThumbnail(videoID: VideoID, timestamp: number, blob: Blob) {
    const imageBitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    canvas.getContext("2d")?.drawImage(imageBitmap, 0, 0);
    
    const videoCache = setupCache(videoID);
    const videoObject: RenderedThumbnailVideo = {
        video: null,
        width: imageBitmap.width,
        height: imageBitmap.height,
        rendered: true,
        onReady: [],
        timestamp,
        canvas,
        fromThumbnailCache: true
    }
    videoCache.video.push(videoObject);

    stopRendering(videoID, "Pre-rendered thumbnail");
    
    const unrendered = videoCache.video.filter(v => v.timestamp === timestamp && !v.rendered);
    if (unrendered.length > 0) {
        for (const video of unrendered) {
            (video as RenderedThumbnailVideo).canvas = canvas;
            video.rendered = true;

            for (const callback of video.onReady) {
                callback(video as RenderedThumbnailVideo);
            }
        }
    }

    for (const failure of videoCache.failures) {
        if (failure.timestamp === timestamp) {
            for (const callback of failure.onReady) {
                callback(videoObject);
            }
        }
    }

    videoCache.failures = videoCache.failures.filter(f => f.timestamp !== timestamp);
}

export function isCachedThumbnailLoaded(videoID: VideoID, timestamp: number): boolean {
    const videoCache = getFromCache(videoID);
    return videoCache?.video?.some(v => v.timestamp === timestamp && v.rendered && v.fromThumbnailCache) ?? false;
}
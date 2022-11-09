export type VideoID = string & { videoIDBrand : never };

export interface PlaybackUrl {
    url: string;
    width: number;
    height: number;
}

interface ThumbnailVideoBase {
    video: HTMLVideoElement | null;
    width: number;
    height: number;
    onReady: Array<(video: RenderedThumbnailVideo) => void>;
    timestamp: number;
}

export type RenderedThumbnailVideo = ThumbnailVideoBase & {
    canvas: HTMLCanvasElement;
    rendered: true;
}

export type ThumbnailVideo = RenderedThumbnailVideo | ThumbnailVideoBase & {
    rendered: false;
};

export interface ThumbnailData {
    video: ThumbnailVideo[];
    playbackUrls: PlaybackUrl[];
    lastUsed: number;
}

export interface Format {
    url: string;
    width: number;
    height: number;
}

//todo: set a max size of this and delete some after a while
const cache: Record<VideoID, ThumbnailData> = {};

async function fetchFormats(videoID: VideoID, ignoreCache: boolean): Promise<Format[]> {
    if (!ignoreCache && cache[videoID]?.playbackUrls) {
        return cache[videoID].playbackUrls;
    }

    const start = Date.now();

    const url = "https://www.youtube.com/youtubei/v1/player";
    const data = {
        context: {
            client: {
                clientName: "WEB",
                clientVersion: "2.20211129.09.00"
            }
        },
        videoId: videoID
    };

    try {
        const result = await fetch(url, {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            method: "POST"
        });

        if (result.ok) {
            type Format = {
                url: string;
                width: number;
                height: number;
            }

            const response = await result.json();
            const formats = response?.streamingData?.adaptiveFormats as Format[];
            if (formats) {
                // Should already be reverse sorted, but reverse sort just incase (not slow if it is correct already)
                const sorted = formats
                    .reverse()
                    .filter((format) => format.width && format.height)
                    .sort((a, b) => a?.width - b?.width);

                console.log(videoID, (Date.now() - start) / 1000, "innerTube");
                cache[videoID] ??= {
                    video: [],
                    playbackUrls: [],
                    lastUsed: Date.now()
                };
                cache[videoID].playbackUrls = sorted.map((format) => ({
                    url: format.url,
                    width: format.width,
                    height: format.height
                }))

                return cache[videoID].playbackUrls;
            }
        }
    } catch (e) {} //eslint-disable-line no-empty

    return [];
}

export async function getPlaybackUrl(videoID: VideoID, 
        width?: number, height?: number, ignoreCache = false): Promise<string | null> {
    const formats = await fetchFormats(videoID, ignoreCache);
    //todo: handle fetching fromats twice at the same time, lock or something

    if (width && height) {
        const bestFormat = formats?.find(f => f?.width >= width && f?.height >= height);

        if (bestFormat) {
            if (cache[videoID]) cache[videoID].lastUsed = Date.now();

            return bestFormat?.url;
        }
    } else if (formats?.length > 0) {
        return formats[0].url;
    }

    return null;
}

//eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getThumbnailTimestamp(videoID: VideoID): number {
    //todo: fetch from server
    return 20.4;
}

// eslint-disable-next-line require-await, @typescript-eslint/no-unused-vars
export async function getTitle(videoID: VideoID): Promise<string> {
    return "Some title goes here";
}

async function renderThumbnail(videoID: VideoID, width: number, 
        height: number, saveVideo: boolean, timestamp: number): Promise<RenderedThumbnailVideo | null> {
    const start = Date.now();

    if (cache[videoID]?.video?.length > 0) {
        const bestVideo = (width && height) ? cache[videoID].video.find(v => v.width >= width && v.height >= height && timestamp === v.timestamp)
            : cache[videoID].video[cache[videoID].video.length - 1];

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
    cache[videoID] ??= {
        video: [],
        playbackUrls: [],
        lastUsed: Date.now()
    };
    cache[videoID].video.push({
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
            const betterVideo = cache[videoID].video.find(v => v.width >= width && v.height >= height 
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

            cache[videoID] ??= {
                video: [],
                playbackUrls: [],
                lastUsed: Date.now()
            };
            const currentVideoInfoIndex = cache[videoID].video.findIndex(v => v.width === video.videoWidth 
                    && v.height === video.videoHeight && v.timestamp === timestamp);
            const currentVideoInfo = currentVideoInfoIndex !== -1 ? cache[videoID].video[currentVideoInfoIndex] : null;
            if (currentVideoInfo) {
                for (const callback of currentVideoInfo.onReady) {
                    callback(videoInfo);
                }

                cache[videoID].video[currentVideoInfoIndex] = videoInfo;
            } else {
                cache[videoID].video.push(videoInfo);
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
                    if (cache[videoID]?.video) {
                        cache[videoID].video = cache[videoID].video.filter(v => v.width !== width && v.height !== height && v.timestamp !== timestamp);
                    }

                    console.error(`Failed to render thumbnail for ${videoID} after ${tries} tries`);
                    return;
                }

                url = await getPlaybackUrl(videoID, width, height, true);
                if (!url) {
                    resolve(null);
                    return;
                }

                cache[videoID] ??= {
                    video: [],
                    playbackUrls: [],
                    lastUsed: Date.now()
                };
                const index = cache[videoID].video.findIndex(v => v.width === width && v.height === height 
                        && v.timestamp === timestamp);
                if (index !== -1) {
                    cache[videoID].video[index].video = video;
                } else {
                    cache[videoID].video.push({
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
        height: number, saveVideo: boolean, ready: () => unknown): Promise<HTMLCanvasElement | null> {
    const urls = await getPlaybackUrl(videoID, width, height);
    if (!urls) return null;

    const timestamp = getThumbnailTimestamp(videoID);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    renderThumbnail(videoID, 0, 0, saveVideo, timestamp).then((smallerCanvasInfo) => {
        if (!smallerCanvasInfo || smallerCanvasInfo.width < width || smallerCanvasInfo.height < height) {
            
            // Try to generate a larger one too and replace it when ready
            // todo: use a better metric than a fixed delay, count number of loading items and use a priority system
            setTimeout(() => {
                renderThumbnail(videoID, width, height, saveVideo, timestamp).then((largerCanvasInfo) => {
                    if (!largerCanvasInfo) return;
    
                    drawCentered(canvas, width, height, largerCanvasInfo);
                    if (!smallerCanvasInfo) ready();
                }).catch(() => {}); //eslint-disable-line @typescript-eslint/no-empty-function
            }, 6000);
            

            if (!smallerCanvasInfo) return;
        }
    
        drawCentered(canvas, width, height, smallerCanvasInfo);
        ready();
    }).catch(() => {}); //eslint-disable-line @typescript-eslint/no-empty-function

    return canvas;
}

function drawCentered(canvas: HTMLCanvasElement, width: number, height: number,
        imageInfo: RenderedThumbnailVideo): void {
    const calculateWidth = height * imageInfo.width / imageInfo.height;
    canvas.getContext("2d")?.drawImage(imageInfo.canvas, (width - calculateWidth) / 2, 0, calculateWidth, height);
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

export async function replaceThumbnail(element: HTMLElement, videoID: VideoID): Promise<boolean> {
    const image = element.querySelector(".ytd-thumbnail img") as HTMLImageElement;

    if (image) {
        const width = 720;
        const height = 404;

        const thumbnail = await createThumbnailCanvas(videoID, width, height, false, () => {
            thumbnail!.style.removeProperty("display");
        });

        if (!thumbnail) return false;

        image.style.display = "none";
        thumbnail.style.display = "none";
        thumbnail.classList.add("style-scope");
        thumbnail.classList.add("ytd-img-shadow");
        image.parentElement?.appendChild(thumbnail);
    }

    return !!image;
}

export async function replaceTitle(element: HTMLElement, videoID: VideoID): Promise<boolean> {
    const titleElement = element.querySelector("#video-title") as HTMLElement;

    //todo: add an option to not hide title
    titleElement.style.visibility = "hidden";

    const title = await getTitle(videoID);
    if (title) {
        titleElement.innerText = title;
    }

    titleElement.style.visibility = "visible";
    return true;
}

export function replaceBranding(element: HTMLElement): Promise<[boolean, boolean]> {
    const link = element.querySelector("#thumbnail") as HTMLAnchorElement;

    if (link) {
        // todo: fastest would be to preload via /browser request
        const videoID = link.href?.match(/\?v=(.{11})/)?.[1] as VideoID;

        return Promise.all([replaceThumbnail(element, videoID),
            replaceTitle(element, videoID)]) as Promise<[boolean, boolean]>;
    }

    return new Promise((resolve) => resolve([false, false]));
}

export function startThumbnailListener(): void {
    // hacky prototype
    const elementsDealtWith = new Set<Element>();
    let stop = 0;
    setInterval(() => {
        // if (stop > 8) return;
        const newElements = [...document.querySelectorAll("ytd-rich-grid-media, ytd-compact-video-renderer")].filter((element) => !elementsDealtWith.has(element));
        for (const element of newElements) {
            elementsDealtWith.add(element);

            void replaceBranding(element as HTMLElement);

            stop++;
            return;
        }
    }, 10);
}
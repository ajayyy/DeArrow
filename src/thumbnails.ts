export type VideoID = string & { videoIDBrand : never };

export async function getPlaybackUrl(videoID: VideoID, 
        width: number, height: number): Promise<{ best: string; smallest: string } | null> {
    const start = Date.now();
    //todo: use innertube, for now return fixed url
    //todo: request from background script
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
                const format = sorted.find(f => f?.width >= width && f?.height >= height);

                if (format) {
                    console.log(videoID, (Date.now() - start) / 1000, "innerTube");
                    return {
                        best: format.url,
                        smallest: sorted[0].url
                    };
                }
            }
        }
    } catch (e) {} //eslint-disable-line no-empty

    return null;
}

//eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getThumbnailTimestamp(videoID: VideoID): number {
    //todo: fetch from server
    return 20.4;
}

export async function createThumbnailElement(videoID: VideoID, width: number, height: number, ready: () => unknown): Promise<HTMLElement | null> {
    const start = Date.now();
    
    const urls = await getPlaybackUrl(videoID, width, height);
    if (!urls) return null;

    const timestamp = getThumbnailTimestamp(videoID);
    const smallestVideo = createVideo(urls.smallest, timestamp);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    let bestVideoLoaded = false
    let readyCalled = false;

    const listener = (isBestVideo: boolean, video: HTMLVideoElement) => {
        if (!isBestVideo && bestVideoLoaded) return;
        if (isBestVideo) bestVideoLoaded = true;

        const calculateWidth = height * video.videoWidth / video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, (width - calculateWidth) / 2, 0, calculateWidth, height);
        
        console.log(videoID, (Date.now() - start) / 1000, isBestVideo ? "full" : "smaller");
        if (!readyCalled) ready();
        readyCalled = true;
        
        video.remove();

        if (!isBestVideo) {
            //todo: wait until all low res have loaded
            setTimeout(() => {
                const bestVideo = createVideo(urls.best, timestamp);
                bestVideo.addEventListener("loadeddata", () => listener(true, bestVideo));
            }, 2000);
        }
    }

    //todo: prevent video from loading more than single frame
    smallestVideo.addEventListener("loadeddata", () => listener(false, smallestVideo));
    
    return canvas;
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

export async function replaceThumbnail(element: HTMLElement): Promise<boolean> {
    const image = element.querySelector(".ytd-thumbnail img") as HTMLImageElement;
    const link = element.querySelector("#thumbnail") as HTMLAnchorElement;

    if (image && link) {
        //todo: don't use src for this as it actually loads in later than other elements
        // #thumbnail url seems to be the fastest, even faster than title
        // fastest would be to preload via /browser request
        const videoID = link.href?.match(/\?v=(.{11})/)?.[1] as VideoID;
        const width = 720;
        const height = 404;

        const thumbnail = await createThumbnailElement(videoID, width, height, () => {
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

export function startThumbnailListener(): void {
    // hacky prototype
    const elementsDealtWith = new Set<Element>();
    let stop = 0;
    setInterval(() => {
        // if (stop > 8) return;
        const newElements = [...document.querySelectorAll("ytd-rich-grid-media")].filter((element) => !elementsDealtWith.has(element));
        for (const element of newElements) {
            elementsDealtWith.add(element);

            void replaceThumbnail(element as HTMLElement);

            stop++;
            return;
        }
    }, 10);
}
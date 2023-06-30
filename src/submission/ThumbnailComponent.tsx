import * as React from "react";
import { drawCenteredToCanvas, renderThumbnail } from "../thumbnails/thumbnailRenderer";
import { waitFor } from "../maze-utils"
import { VideoID } from "../maze-utils/video";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";

export enum ThumbnailType {
    CurrentTime,
    SpecifiedTime,
    Original
}

export interface ThumbnailComponentProps {
    video: HTMLVideoElement;
    selected?: boolean;
    onClick?: (thumbnail: ThumbnailSubmission) => void;
    onError: (error: string) => void;
    type: ThumbnailType;
    videoID: VideoID;
    time?: number;
    children?: React.ReactNode;
    larger?: boolean;
}

const defaultThumbnailOptions = [
    "maxresdefault",
    "mqdefault",
    "sddefault",
    "hqdefault"
]

const aspectRatio = 16 / 9;


export const ThumbnailComponent = (props: ThumbnailComponentProps) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const lastTime = React.useRef(null) as React.MutableRefObject<number | null>;
    const inRenderingLoop = React.useRef(false);
    const [defaultThumbnailOption, setDefaultThumbnailOption] = React.useState(0);

    const canvasWidth = Math.ceil(calculateCanvasWidth(props.larger ?? false));
    const canvasHeight = Math.ceil(canvasWidth / aspectRatio);

    React.useEffect(() => {
        const video = props.video;

        if (props.type === ThumbnailType.CurrentTime) {
            const playListener = () => renderCurrentFrame(props, canvasRef, inRenderingLoop, true);
            const seekedListener = () => () => {
                // If playing, it's already waiting for the next frame from the other listener
                if (video.paused) {
                    renderCurrentFrame(props, canvasRef, inRenderingLoop, false);
                }
            };

            video.addEventListener("playing", playListener);
            video.addEventListener("seeked", seekedListener);

            renderCurrentFrame(props, canvasRef, inRenderingLoop, !video.paused);

            return () => {
                video.removeEventListener("playing", playListener);
                video.removeEventListener("seeked", seekedListener);
            };
        }

        return () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
    }, [props.video]);

    React.useEffect(() => {
        setDefaultThumbnailOption(0);
    }, [props.videoID]);

    React.useEffect(() => {
        if (props.time !== lastTime.current) {
            lastTime.current = props.time ?? null;

            if (props.type === ThumbnailType.SpecifiedTime) {
                canvasRef.current?.getContext("2d")?.clearRect(0, 0, canvasRef.current?.width, canvasRef.current?.height);
                if (props.video.paused && props.time === props.video.currentTime) {
                    // Skip rendering and just use existing video frame
                    renderCurrentFrame(props, canvasRef, inRenderingLoop, false);
                } else {
                    renderThumbnail(props.videoID, canvasWidth, canvasHeight, false, props.time!).then((rendered) => {
                        waitFor(() => canvasRef?.current).then(async () => {
                            if (rendered) {
                                const imageBitmap = await createImageBitmap(rendered.blob);

                                drawCenteredToCanvas(canvasRef.current!, canvasRef.current!.width, canvasRef.current!.height,
                                    imageBitmap.width, imageBitmap.height, imageBitmap);
                            } else {
                                props.onError(chrome.i18n.getMessage("FailedToRender"));
                            }
                        }).catch(() => {
                            props.onError(chrome.i18n.getMessage("CanvasMissing"))
                        });
                    }).catch(() => {
                        props.onError(chrome.i18n.getMessage("ExceptionWhileRendering"))
                    });
                }
            }
        }
    }, [props.time]);

    return (
        <div className={`cbThumbnail${props.selected ? " cbThumbnailSelected" : ""}`}
                onClick={() => {
                    if (props.type === ThumbnailType.CurrentTime && props.video.paused) {
                        // Ensure video is showing correct frame (destructive, will affect visible video)
                        props.video.currentTime = props.video.currentTime;
                    }

                    props.onClick?.(props.type === ThumbnailType.Original ? {
                        original: true
                    } : {
                        original: false,
                        timestamp: props.type === ThumbnailType.CurrentTime ? props.video.currentTime : props.time!
                    });
                }}>
            {
                props.type === ThumbnailType.Original ?
                <img 
                    className="cbThumbnailImg" 
                    src={`https://i.ytimg.com/vi/${props.videoID}/${defaultThumbnailOptions[defaultThumbnailOption]}.jpg`}
                    onLoad={(e) => {
                        // If the image is the default thumbnail, try the next one
                        if ((e.target as HTMLImageElement).naturalWidth === 120) {
                            if (defaultThumbnailOption < defaultThumbnailOptions.length - 1) {
                                setDefaultThumbnailOption(defaultThumbnailOption + 1);
                            } else {
                                props.onError(chrome.i18n.getMessage("FailedToLoad"));
                            }
                        }
                    }}></img> :
                null
            }
            {
                props.type === ThumbnailType.CurrentTime || props.type === ThumbnailType.SpecifiedTime ?
                // When hovering for current time, update the current time with the latest hovered frame
                <canvas ref={canvasRef} className="cbThumbnailImg" width={canvasWidth} height={canvasHeight}>
                </canvas> :
                null
            }

            {props.children}
        </div>
    );
};

/**
 * Will keep rendering until paused if waitForNextFrame is true
 */
async function renderCurrentFrame(props: ThumbnailComponentProps,
        canvasRef: React.RefObject<HTMLCanvasElement>,
        inRenderingLoop: React.MutableRefObject<boolean>,
        waitForNextFrame: boolean): Promise<void> {
    try {
        await waitFor(() => canvasRef?.current && props.video.duration > 0 && props.video.readyState > 2);

        props.onError("");
        canvasRef.current!.getContext("2d")!.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        drawCenteredToCanvas(canvasRef.current!, canvasRef.current!.width, canvasRef.current!.height, props.video.videoWidth, props.video.videoHeight, props.video);

        if (waitForNextFrame && !props.video.paused && !inRenderingLoop.current) {
            inRenderingLoop.current = true;
            const nextLoop = () => {
                inRenderingLoop.current = false;
                renderCurrentFrame(props, canvasRef, inRenderingLoop, true);
            };

            if (props.video.requestVideoFrameCallback) {
                props.video.requestVideoFrameCallback(nextLoop);
            } else {
                setTimeout(nextLoop, 1000);
            }
        }
    } catch (e) {
        props.onError(chrome.i18n.getMessage("VideoNotReady"));
    }
}

function calculateCanvasWidth(larger: boolean): number {
    const fallback = larger ? 720 : 100;

    const watchFlexy = document.querySelector("ytd-watch-flexy");
    if (!watchFlexy) return fallback;

    const containerWidth = parseFloat(getComputedStyle(watchFlexy)
        .getPropertyValue("--ytd-watch-flexy-sidebar-width")?.replace("px", ""));

    const factor = larger ? 1 : 0.2;
    if (containerWidth && !isNaN(containerWidth)) {
        return containerWidth * window.devicePixelRatio * factor;
    } else {
        return fallback;
    }
}
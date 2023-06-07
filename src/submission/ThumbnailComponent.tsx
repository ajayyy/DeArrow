import * as React from "react";
import { drawCentered, renderThumbnail } from "../thumbnails/thumbnailRenderer";
import { waitFor } from "@ajayyy/maze-utils"
import { VideoID } from "@ajayyy/maze-utils/lib/video";
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
}

const defaultThumbnailOptions = [
    "maxresdefault",
    "mqdefault",
    "sddefault",
    "hqdefault"
]

// todo: remove this
const canvasWidth = 720;
const canvasHeight = 404;

export const ThumbnailComponent = (props: ThumbnailComponentProps) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const lastTime = React.useRef(null) as React.MutableRefObject<number | null>;
    const inRenderingLoop = React.useRef(false);
    const [defaultThumbnailOption, setDefaultThumbnailOption] = React.useState(0);

    React.useEffect(() => {
        if (props.type === ThumbnailType.CurrentTime) {
            props.video.addEventListener("playing", () => renderCurrentFrame(props, canvasRef, inRenderingLoop, true));
            props.video.addEventListener("seeked", () => {
                // If playing, it's already waiting for the next frame from the other listener
                if (props.video.paused) {
                    renderCurrentFrame(props, canvasRef, inRenderingLoop, false);
                }
            });

            renderCurrentFrame(props, canvasRef, inRenderingLoop, !props.video.paused);
        }
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
                        waitFor(() => canvasRef?.current).then(() => {
                            if (rendered) {
                                drawCentered(canvasRef.current!, canvasRef.current!.width, canvasRef.current!.height,
                                    rendered.width, rendered.height, rendered.canvas);
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
                        if ((e.target as HTMLImageElement).width === 120) {
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
        drawCentered(canvasRef.current!, canvasRef.current!.width, canvasRef.current!.height, props.video.videoWidth, props.video.videoHeight, props.video);

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
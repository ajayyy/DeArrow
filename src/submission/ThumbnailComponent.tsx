import * as React from "react";
import { getFormattedTime } from "@ajayyy/maze-utils/lib/formating";
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
    large: boolean;
    onClick: (thumbnail: ThumbnailSubmission, oldTime: number | undefined) => void;
    type: ThumbnailType;
    videoID: VideoID;
    time?: number;
    firstElem: boolean;
    lastElem: boolean;
}

const canvasWidth = 720;
const canvasHeight = 404;

export const ThumbnailComponent = (props: ThumbnailComponentProps) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const hoveredCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [hovered, setHovered] = React.useState(false);
    const [time, setTime] = React.useState(props.type === ThumbnailType.CurrentTime ? props.video.currentTime : props.time);
    const [error, setError] = React.useState(false)
    const lastTime = React.useRef(null) as React.MutableRefObject<number | null>;
    const [drawInterval, setDrawInterval] = React.useState<NodeJS.Timer | null>(null);

    // State is only used for the current time thumbnail, otherwise stay updated to upstream value
    if (props.time && time !== props.time) {
        setTime(props.time);
    }

    if (props.type === ThumbnailType.CurrentTime) {
        React.useEffect(() => {
            waitFor(() => canvasRef?.current && props.video.duration > 0 && props.video.readyState > 2).then(() => {
                canvasRef.current!.getContext("2d")!.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

                renderCurrentFrame(props.video, canvasRef.current!);
                setTime(props.video.currentTime);
            }).catch(() => setError(true));
        }, [props.videoID]);
    }

    if (time != null && props.type === ThumbnailType.SpecifiedTime) {
        React.useEffect(() => {
            if (props.type !== ThumbnailType.Original && time !== lastTime.current) {
                lastTime.current = time ?? null;
    
                renderThumbnail(props.videoID, canvasWidth, canvasHeight, false, time).then((rendered) => {
                    waitFor(() => canvasRef?.current).then(() => {
                        if (rendered) {
                            drawCentered(canvasRef.current!, canvasRef.current!.width, canvasRef.current!.height,
                                rendered.width, rendered.height, rendered.canvas);
                        } else {
                            setError(true);
                        }
                    }).catch(() => {
                        setError(true)
                    });
                }).catch(() => {
                    setError(true)
                });
                
            }
        }, [time]);
    }

    const updateRender = () => {
        if (props.type === ThumbnailType.CurrentTime && hoveredCanvasRef.current) {
            renderCurrentFrame(props.video, hoveredCanvasRef.current);
        }
    };

    const style: React.CSSProperties = {};
    if (props.firstElem) {
        style.marginLeft = "0px";
    } else if (props.lastElem) {
        style.marginRight = "0px";
    }

    return (
        <div className={`cbThumbnail${props.large ? " cbThumbnailLarge" : ""}`}
                style={style}
                onClick={() => {
                    const originalTime = time;
                    let newTime = time;
                    if (props.type === ThumbnailType.CurrentTime && canvasRef.current 
                        && time !== props.video.currentTime) {
                        renderCurrentFrame(props.video, canvasRef.current);

                        newTime = props.video.currentTime;
                        setTime(newTime);
                    }

                    props.onClick(props.type === ThumbnailType.Original ? {
                        original: true
                    } : {
                        original: false,
                        timestamp: newTime!
                    }, originalTime);

                }}
                onMouseEnter={() => {
                    setHovered(true);

                    if (props.video.paused) {
                        updateRender();
                    } else {
                        setDrawInterval(setInterval(() => {
                            updateRender();
                        }, 10));
                    }
                }}
                onMouseLeave={() => {
                    setHovered(false);

                    if (drawInterval) {
                        clearInterval(drawInterval);
                        setDrawInterval(null);
                    }
                }}>
            {
                props.type === ThumbnailType.Original ?
                <img className="cbThumbnailImg" src={`https://i.ytimg.com/vi/${props.videoID}/hq720.jpg`}></img> :
                null
            }
            {
                props.type === ThumbnailType.CurrentTime || props.type === ThumbnailType.SpecifiedTime ?
                // When hovering for current time, update the current time with the latest hovered frame
                <canvas ref={canvasRef} className="cbThumbnailImg" width={canvasWidth} height={canvasHeight}
                    style={{display: hovered && props.type === ThumbnailType.CurrentTime ? "none" : "block"}}>
                </canvas> :
                null
            }
            {
                props.type === ThumbnailType.CurrentTime ?
                <canvas ref={hoveredCanvasRef} className="cbThumbnailImg" width={canvasWidth} height={canvasHeight}
                    style={{ opacity: "0.9", display: hovered ? "block" : "none" }}>
                </canvas> :
                null
            }

            <div style={{ fontWeight: "bold", textAlign: "center", marginTop: "4px" }}>
                {error ? <div>{chrome.i18n.getMessage("UnknownError")}</div> : null}
                {time != null ? <div>{getFormattedTime(time)}</div> : <div>{chrome.i18n.getMessage("Original")}</div>}
                {props.type === ThumbnailType.CurrentTime ?  <div>{chrome.i18n.getMessage("CurrentTime")}</div> : ""}
            </div>
        </div>
    );
};

function renderCurrentFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    if (video.paused) {
        // Ensure video is showing correct frame (destructive, will affect visible video)
        video.currentTime = video.currentTime;
    }

    drawCentered(canvas, canvas.width, canvas.height, video.videoWidth, video.videoHeight, video);
}
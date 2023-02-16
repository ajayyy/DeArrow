import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { getYouTubeTitleNode } from "@ajayyy/maze-utils/lib/elements"
import { waitFor } from "@ajayyy/maze-utils"
import { BrandingResult } from "../videoBranding/videoBranding";
import { SubmissionComponent } from "./SubmissionComponent";
import { getVideo, getVideoID, isOnMobileYouTube } from "@ajayyy/maze-utils/lib/video";
import { log } from "../utils/logger";
import { TitleSubmission } from "../titles/titleData";
import { ThumbnailSubmission } from "../thumbnails/thumbnailData";
import { submitVideoBranding } from "../dataFetching";
import Config from "../config";

export class SubmitButton {
    button: HTMLButtonElement;
    buttonImage: HTMLImageElement;
    container: HTMLElement;
    root: Root;

    mutationObserver?: MutationObserver;

    submissions: BrandingResult;

    constructor() {
        this.submissions = {
            thumbnails: [],
            titles: []
        }
    }

    async attachToPage(): Promise<void> {
        if (!getVideo() || !getVideoID()) {
            log("Not attaching submit button, no video");
            return;
        }

        const referenceNode = await waitFor(() => getYouTubeTitleNode());
        if (referenceNode) {
            if (!referenceNode.contains(this.button)) {
                if (!this.button) {
                    this.button = document.createElement('button');
                    this.button.className = "cbSubmitButton cbButton";

                    this.buttonImage = document.createElement("img");
                    this.button.draggable = false;
                    this.buttonImage.className = "cbSubmitButtonImage";
                    this.buttonImage.src = chrome.runtime.getURL("icons/pencil.svg");

                    // Append image to button
                    this.button.appendChild(this.buttonImage);
                    this.button.addEventListener('click', () => {
                        if (this.container.style.display === "none") {
                            this.open();
                        } else {
                            this.close();
                        }
                    });
                }

                referenceNode.appendChild(this.button);
            }


            if (!referenceNode.contains(this.container)) {
                if (!this.container) {
                    this.container = document.createElement('span');
                    this.container.id = "cbSubmitMenu";
                    this.container.style.display = "none";
    
                    this.root = createRoot(this.container);
                    //todo: setup params, call this class and then test
                    //todo: don't render right away if not visible
                    this.root.render(<SubmissionComponent video={getVideo()!} videoID={getVideoID()!} submissions={this.submissions} submitClicked={this.submitPressed} />);

                    if (isOnMobileYouTube()) {
                        if (this.mutationObserver) {
                            this.mutationObserver.disconnect();
                        }
                        
                        this.mutationObserver = new MutationObserver(() => 
                            void this.attachToPage());
        
                        this.mutationObserver.observe(referenceNode, { 
                            childList: true,
                            subtree: true
                        });
                    }
                }
    
                referenceNode.appendChild(this.container);
                referenceNode.style.display = "flex";
            }
        }
    }

    close(): void {
        this.container.style.display = "none";
    }

    open(): void {
        this.container.style.removeProperty("display");
    }

    clearSubmissions(): void {
        this.setSubmissions({
            thumbnails: [],
            titles: []
        });
    }

    setSubmissions(submissions: BrandingResult): void {
        this.submissions = submissions;
        this.root.render(<SubmissionComponent video={getVideo()!} videoID={getVideoID()!} submissions={this.submissions} submitClicked={this.submitPressed} />);
    }

    private async submitPressed(title: TitleSubmission, thumbnail: ThumbnailSubmission): Promise<void> {
        const result = await submitVideoBranding(getVideoID()!, title, thumbnail);

        if (result) {
            this.close();

            // Set the unsubmitted as selected
            const unsubmitted = Config.local!.unsubmitted[getVideoID()!];
            if (unsubmitted) {
                unsubmitted.titles.forEach((t) => t.selected = false);
                unsubmitted.thumbnails.forEach((t) => t.selected = false);

                if (thumbnail.original && !unsubmitted.thumbnails.find((t) => t.original)) {
                    unsubmitted.thumbnails.push({
                        original: true,
                        selected: true
                    });
                }

                const unsubmittedTitle = unsubmitted.titles.find((t) => t.title === title.title);
                if (unsubmittedTitle) unsubmittedTitle.selected = true;
                
                const unsubmittedThumbnail = unsubmitted.thumbnails.find((t) => (t.original && thumbnail.original) 
                    || (!t.original && !thumbnail.original && t.timestamp === thumbnail.timestamp))
                if (unsubmittedThumbnail) unsubmittedThumbnail.selected = true;
            }
        }
    }
}
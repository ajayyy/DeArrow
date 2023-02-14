import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { getYouTubeTitleNode } from "@ajayyy/maze-utils/lib/elements"
import { waitFor } from "@ajayyy/maze-utils"
import { BrandingResult } from "../videoBranding/videoBranding";
import { SubmissionComponent } from "./SubmissionComponent";
import { getVideo, getVideoID, isOnMobileYouTube } from "@ajayyy/maze-utils/lib/video";
import { log } from "../utils/logger";

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
                            this.container.style.removeProperty("display");
                        } else {
                            this.container.style.display = "none";
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
                    this.root.render(<SubmissionComponent video={getVideo()!} videoID={getVideoID()!} submissions={this.submissions} />);

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

    setSubmissions(submissions: BrandingResult): void {
        this.submissions = submissions;
        this.root.render(<SubmissionComponent video={getVideo()!} videoID={getVideoID()!} submissions={this.submissions} />);
    }
}
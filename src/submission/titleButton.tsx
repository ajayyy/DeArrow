import { createRoot, Root } from "react-dom/client";
import { getVideo, isOnMobileYouTube } from "../../maze-utils/src/video";
import { log, logError } from "../utils/logger";
import Config from "../config/config";
import { addTitleChangeListener, getOrCreateTitleButtonContainer } from "../utils/titleBar";
import { onMobile } from "../../maze-utils/src/pageInfo";
import { addCleanupListener } from "../../maze-utils/src/cleanup";

const disabledIcon = `
<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
<defs>
<filter id="c" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
<feColorMatrix values="0.21 0.72 0.072 0 0 0.21 0.72 0.072 0 0 0.21 0.72 0.072 0 0 0 0 0 1 0 "/>
</filter>
<filter id="b" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
<feColorMatrix values="0.21 0.72 0.072 0 0 0.21 0.72 0.072 0 0 0.21 0.72 0.072 0 0 0 0 0 1 0 "/>
</filter>
<filter id="a" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
<feColorMatrix values="0.21 0.72 0.072 0 0 0.21 0.72 0.072 0 0 0.21 0.72 0.072 0 0 0 0 0 1 0 "/>
</filter>
</defs>
<path d="m36 18.344c0 4.981-2.46 9.198-5.655 12.462s-7.323 5.152-12.199 5.152-9.764-1.112-12.959-4.376-5.187-8.257-5.187-13.238 2.574-9.38 5.769-12.644 7.502-5.658 12.377-5.658 9.394 2.178 12.589 5.442c3.196 3.264 5.265 7.88 5.265 12.86z" fill="#1213bd" filter="url(#a)"/>
<path d="m30.394 18.41c0 3.4688-1.143 6.8655-3.4165 9.1379-2.2735 2.2724-5.6701 2.9287-9.1379 2.9287s-6.3735-1.1472-8.647-3.4197c-2.2735-2.2724-3.5871-5.1782-3.5871-8.647 0-3.4688 0.94205-6.7461 3.2145-9.0196 2.2724-2.2735 5.5508-3.9514 9.0196-3.9514s6.4928 1.9323 8.7663 4.2047c2.2735 2.2724 3.7881 5.2975 3.7881 8.7663z" fill="#88c9f9" filter="url(#b)" stroke-width="1.0467"/>
<path d="m23.958 17.818c0 3.1537-2.6449 5.8081-5.7986 5.8081-3.1537 0-5.5998-2.6544-5.5998-5.8081 0-3.1537 2.4461-5.7217 5.5998-5.7217 3.1537 0 5.7986 2.568 5.7986 5.7217z" fill="#0a62a5" filter="url(#c)" stroke-width="1.1834"/>
<rect transform="rotate(45)" x="4.207" y="-2.7506" width="42.498" height="5.5013" ry="1.381" fill="#6a0000" stroke-opacity="0"/>
<rect transform="rotate(135)" x="-21.249" y="-28.206" width="42.498" height="5.5013" ry="1.381" fill="#6a0000" stroke-opacity="0"/>
</svg>`;

export class TitleButton {
    button: HTMLButtonElement;
    container: HTMLElement | null;
    root: Root | null;

    mutationObserver?: MutationObserver;

    buttonIcon: string;
    buttonTitle: string;
    className: string;

    displayFloating: boolean;

    constructor(buttonIcon: string, buttonTitle: string, className: string, displayFloating = false) {
        this.buttonIcon = buttonIcon;
        this.buttonTitle = buttonTitle;
        this.className = className;
        this.displayFloating = displayFloating;

        addCleanupListener(() => {
            this.mutationObserver?.disconnect?.();

            this.close();
        });
    }

    async attachToPage(): Promise<void> {
        if (!getVideo()) {
            log("Not attaching submit button, no video");
            return;
        }

        const referenceNode = await getOrCreateTitleButtonContainer();
        if (referenceNode) {
            if (!referenceNode.contains(this.button)) {
                if (!this.button) {
                    const existingButton = referenceNode.querySelector(`.${this.className}`);
                    if (existingButton) {
                        existingButton.remove();
                    }

                    this.button = document.createElement('button');
                    this.button.className = `${this.className} cbButton cbTitleButton` + (onMobile() ? " cbMobileButton" : "");
                    this.updateIcon();
                    this.button.draggable = false;

                    this.button.addEventListener("click", (e) => {
                        if (!chrome.runtime?.id) return;
                        e.stopPropagation();

                        if (Config.config!.extensionEnabled) {
                            this.openOrClose().catch(logError);
                        } else {
                            Config.config!.extensionEnabled = true;
                            this.updateIcon();
                        }
                    });
                }

                referenceNode.appendChild(this.button);
            }
        }

        addTitleChangeListener(() => {
            this.render();
        });
    }

    updateIcon(): void {
        if (Config.config!.extensionEnabled) {
            this.button.innerHTML = this.buttonIcon;
            this.button.title = this.buttonTitle;
        } else {
            this.button.innerHTML = disabledIcon;
            this.button.title = chrome.i18n.getMessage("DeArrowIsDisabled");
        }
    }

    close(): void {
        if (this.container) {
            // Experimental YouTube layout with description on right
            const isOnDescriptionOnRightLayout = document.querySelector("#title #description");
            if (isOnDescriptionOnRightLayout) {
                // Undo preventing color from changing on hover
                const title = document.querySelector("#above-the-fold #title") as HTMLElement | null;
                if (title) {
                    title.style.removeProperty("background");
                }
            }
            
            this.root?.unmount?.();
            this.root = null;
            this.container.remove();
            this.container = null;
        }
    }

    async openOrClose(): Promise<void> {
        const referenceNode = this.button?.parentElement ?? await getOrCreateTitleButtonContainer();
        if (!referenceNode) return;

        // Experimental YouTube layout with description on right
        const isOnDescriptionOnRightLayout = document.querySelector("#title #description");

        let popupNode = onMobile()
            ? document.querySelector(".watch-below-the-player") 
            : document.querySelector("#secondary-inner");
        if (!popupNode || popupNode.childElementCount < 2 || isOnDescriptionOnRightLayout || this.displayFloating) {
            popupNode = referenceNode.parentElement;
        }

        if (popupNode && !popupNode.contains(this.container)) {
            if (!this.container) {
                this.container = document.createElement('span');
                this.container.id = "cbSubmitMenu";

                if (isOnDescriptionOnRightLayout) {
                    this.container.style.marginTop = referenceNode.parentElement?.offsetHeight + "px";

                    // Prevent color from changing on hover
                    referenceNode.parentElement!.parentElement!.style.background = "transparent";
                }

                this.root = createRoot(this.container);
                this.render();
            }

            popupNode.insertBefore(this.container, popupNode.firstChild);

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
        } else {
            this.close();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    render(): void { }
}
import * as React from "react";
import { CasualVoteInfo, replaceCurrentVideoBranding } from "../videoBranding/videoBranding";
import { getVideoID, getYouTubeVideoID } from "../../maze-utils/src/video";
import { logError } from "../utils/logger";
import { submitVideoCasualVote } from "../dataFetching";
import Config from "../config/config";
import { closeGuidelineChecklist } from "./SubmissionChecklist";
import { TitleButton } from "./titleButton";
import { CasualVoteComponent } from "./CasualVoteComponent";

const casualVoteButtonIcon = `
<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<g transform="matrix(.65609 .65609 -.65609 .65609 13.808 -2.787)">
<g transform="translate(.16294 .16294)">
<g transform="translate(.46496 -.13909)">
<path transform="rotate(-90 9.8928 12.649)" d="m22.69 10.539 8.4e-5 4.1012-16.082-1e-6 5e-7 -4.1012zm-0.12023-1.9092-17.87-5e-7 -3.205e-4 8.061 17.871 1e-6a2.0294 2.0294 135 0 0 2.0294-2.0294l5.2e-5 -4.0022a2.0294 2.0294 45 0 0-2.0294-2.0294z"/>
<path d="m6.8695 19.632c-1.4544 1.4544-1.453 3.8033 0.0014 5.2577 1.1478 1.1478 0.73458 2.7678-0.0014 3.5038 1.875 0.26284 3.9435-0.43835 5.2577-1.7526 1.9363-1.9363 1.9363-5.0712-1e-6 -7.0075-1.4544-1.4544-3.8033-1.4558-5.2577-0.0014zm1.7526 1.7526c0.48188-0.48188 1.2721-0.48188 1.754-1e-6 0.96376 0.96377 0.96238 2.54-0.0014 3.5038-0.14894 0.14894-0.28786 0.28984-0.48061 0.39498-0.21027-0.75349-0.62223-1.4978-1.2706-2.1462-0.48188-0.48188-0.48326-1.2707-0.0014003-1.7526z" stroke-width="1.2391"/>
</g>
</g>
</g>
</svg>`;

export class CasualVoteButton extends TitleButton {
    existingVotes: CasualVoteInfo[];

    constructor() {
        super(casualVoteButtonIcon, chrome.i18n.getMessage("OpenCasualVoteMenu"), "cbCasualVoteButton", true);
        this.existingVotes = [];
    }

    close(): void {
        closeGuidelineChecklist();

        super.close();
    }

    clearExistingVotes(): void {
        this.existingVotes = [];
    }

    setExistingVotes(existingVotes: CasualVoteInfo[]): void {
        this.existingVotes = existingVotes;
        this.render();
    }

    render(): void {
        if (this.root) {
            this.root?.render(<CasualVoteComponent
                videoID={getVideoID()!}
                existingVotes={this.existingVotes}
                submitClicked={(categories, downvote) => this.submitPressed(categories, downvote)}
            />);
        }
    }

    private async submitPressed(categories: string[], downvote: boolean): Promise<boolean> {
        if (getVideoID() !== getYouTubeVideoID()) {
            alert(chrome.i18n.getMessage("videoIDWrongWhenSubmittingError"));
            return false;
        }

        const result = await submitVideoCasualVote(getVideoID()!, categories, downvote);

        if (result && result.ok) {
            this.close();

            setTimeout(() => replaceCurrentVideoBranding().catch(logError), 1100);

            return true;
        } else {
            const text = result.responseText;

            if (text.includes("<head>")) {
                alert(chrome.i18n.getMessage("502"));
            } else {
                alert(text);
            }

            return false;
        }
    }

    updateIcon(): void {
        if (Config.config!.extensionEnabled && Config.config!.casualMode) {
            this.button.style.removeProperty("display");

            super.updateIcon();
        } else {
            this.button.style.display = "none";
        }
    }
}
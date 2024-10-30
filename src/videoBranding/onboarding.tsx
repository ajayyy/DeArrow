import * as React from "react";
import Config, { TitleFormatting } from "../config/config";
import { getVideoThumbnailIncludingUnsubmitted, getVideoTitleIncludingUnsubmitted } from "../dataFetching";
import { VideoID } from "../../maze-utils/src/video";
import { FormattingOptionsComponent } from "../popup/FormattingOptionsComponent";
import { Tooltip } from "../utils/tooltip";
import { BrandingLocation, ShowCustomBrandingInfo, getActualShowCustomBranding } from "./videoBranding";
import * as CompileConfig from "../../config.json"
import { isLiveOrUpcoming } from "../thumbnails/thumbnailData";

export async function handleOnboarding(element: HTMLElement, videoID: VideoID,
        brandingLocation: BrandingLocation, showCustomBranding: ShowCustomBrandingInfo, result: [boolean, boolean]): Promise<void> {

    if (Config.config!.showInfoAboutRandomThumbnails && await getActualShowCustomBranding(showCustomBranding) && element && videoID
            && brandingLocation === BrandingLocation.Related && document.URL === "https://www.youtube.com/"
            && !CompileConfig.debug) {
        
        const ignoreTitleChange = Config.config!.titleFormatting === TitleFormatting.Disable;

        // Both title and thumbnail changed due to random time or title format
        // Ignore title changes if title formatting is disabled
        if (result[0] && !(await getVideoThumbnailIncludingUnsubmitted(videoID, brandingLocation, false))
            && (ignoreTitleChange || (result[1] && !(await getVideoTitleIncludingUnsubmitted(videoID, brandingLocation))))
            && !await isLiveOrUpcoming(videoID)) {
            
            // Check if notice will be visible (since it appears to the left of the element)
            const box = element.closest("#contents");
            const boundingRect = element.getBoundingClientRect();
            const elementAtLeft = document.elementFromPoint(boundingRect.x - boundingRect.width, boundingRect.y);
            if (Config.config!.showInfoAboutRandomThumbnails && box && box.contains(elementAtLeft)) {
                Config.config!.showInfoAboutRandomThumbnails = false;

                const firstMessage = ignoreTitleChange ? chrome.i18n.getMessage("RandomThumbnailExplanation")
                    : chrome.i18n.getMessage("RandomThumbnailAndAutoFormattedExplanation");

                new Tooltip({
                    text: [firstMessage, chrome.i18n.getMessage("YouCanChangeThisDefaultBelow")].join(". "),
                    referenceNode: element,
                    prependElement: element.firstElementChild as HTMLElement,
                    positionRealtive: false,
                    containerAbsolute: true,
                    bottomOffset: "inherit",
                    rightOffset: "100%",
                    innerBottomMargin: "10px",
                    displayTriangle: true,
                    center: true,
                    opacity: 1,
                    extraClass: "rightSBTriangle cbOnboarding",
                    elements: [
                        <FormattingOptionsComponent key={0}/>
                    ]
                });
            }
        }
    }
}
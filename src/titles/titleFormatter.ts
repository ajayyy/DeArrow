import { VideoID } from "../../maze-utils/src/video";
import Config from "../config/config";
import { getTitleFormatting, shouldCleanEmojis } from "../config/channelOverrides";
import { TitleFormatting, formatTitle as formatTitleInternal } from '../../title-formatting/src'


export async function formatTitle(title: string, isCustom: boolean, videoID: VideoID | null): Promise<string> {
    return formatTitleInternal(title, isCustom, await getTitleFormatting(videoID), await shouldCleanEmojis(videoID), Config.config!.onlyTitleCaseInEnglish);
}

export function formatTitleDefaultSettings(title: string, isCustom: boolean): Promise<string> {
    return formatTitleInternal(title, isCustom, Config.config!.titleFormatting, Config.config!.shouldCleanEmojis, Config.config!.onlyTitleCaseInEnglish);
}


export async function localizeHtmlPageWithFormatting(): Promise<void> {
    // Localize by replacing __MSG_***__ meta tags
    const localizedTitle = await getLocalizedMessageWithFormatting(document.title);
    if (localizedTitle) document.title = localizedTitle;

    const body = document.querySelector(".sponsorBlockPageBody");
    const localizedMessage = await getLocalizedMessageWithFormatting(body!.innerHTML.toString());
    if (localizedMessage) body!.innerHTML = localizedMessage;
}

async function getLocalizedMessageWithFormatting(text: string): Promise<string | false> {
    const promises: Promise<string>[] = [];
    text.replace(/__MSG_(\w+)__|(DeArrow|Ajay Ramachandran)/g, (match, v1: string, v2) => {
        if (v2) {
            promises.push(formatTitle(v2, false, null));
        } else if (v1) {
            if (v1.match(/^what|Description\d?$/) && Config.config!.titleFormatting === TitleFormatting.TitleCase) {
                // Don't title case descriptions
                promises.push(Promise.resolve(chrome.i18n.getMessage(v1).replace(/</g, "&#60;")
                    .replace(/"/g, "&quot;")
                    .replace(/\n/g, "<br/>")));
            } else {
                promises.push(
                    formatTitle(chrome.i18n.getMessage(v1), false, null)
                        .then((result) => result.replace(/</g, "&#60;")
                                                .replace(/"/g, "&quot;")
                                                .replace(/\n/g, "<br/>")));
            }
        } else {
            promises.push(Promise.resolve(""));
        }

        return "";
    });

    const results = await Promise.all(promises);

    let count = 0;
    const valNewH = text.replace(/__MSG_(\w+)__|(DeArrow|Ajay Ramachandran)/g, () => {
        return results[count++];
    });

    if (valNewH != text) {
        return valNewH;
    } else {
        return false;
    }
}

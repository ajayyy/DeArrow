import { setupTabUpdates } from "@ajayyy/maze-utils/lib/tab-updates";
import { setupBackgroundRequestProxy } from "@ajayyy/maze-utils/lib/background-request-proxy";
import { generateUserID } from "@ajayyy/maze-utils/lib/setup";
import Config from "./config";
import { isSafari } from "@ajayyy/maze-utils/lib/config";
import * as CompileConfig from "../config.json";
import { isFirefoxOrSafari } from "@ajayyy/maze-utils";

setupTabUpdates(Config);
setupBackgroundRequestProxy();

chrome.runtime.onInstalled.addListener(function () {
    // This let's the config sync to run fully before checking.
    // This is required on Firefox
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
        const userID = Config.config!.userID;

        // If there is no userID, then it is the first install.
        if (!userID){
            // First check for config from SponsorBlock extension
            const sponsorBlockConfig = await Promise.race([
                new Promise((resolve) => setTimeout(resolve, 1000)),
                new Promise((resolve) => {
                    const extensionIds = getExtensionIdsToImportFrom();
                    
                    for (const id of extensionIds) {
                        chrome.runtime.sendMessage(id, { message: "requestConfig" }, (response) => {
                            if (response) {
                                resolve(response);
                            }
                        });
                    }
                })
            ]);

            if (sponsorBlockConfig) {
                Config.config!.userID = sponsorBlockConfig["userID"];
                Config.config!.allowExpirements = sponsorBlockConfig["allowExpirements"];
                Config.config!.showDonationLink = sponsorBlockConfig["showDonationLink"];
                Config.config!.showUpsells = sponsorBlockConfig["showUpsells"];
                Config.config!.darkMode = sponsorBlockConfig["darkMode"];
            } else {
                const newUserID = generateUserID();
                Config.config!.userID = newUserID;
            }

            // Open up the install page
            setTimeout(() => void chrome.tabs.create({url: chrome.extension.getURL("/help/index.html")}), 100);
        }
    }, 1500);
});

function getExtensionIdsToImportFrom(): string[] {
    if (isSafari()) {
        return CompileConfig.extensionImportList.safari;
    } else if (isFirefoxOrSafari()) {
        return CompileConfig.extensionImportList.firefox;
    } else {
        return CompileConfig.extensionImportList.chromium;
    }
}
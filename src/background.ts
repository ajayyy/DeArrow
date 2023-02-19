import { setupTabUpdates } from "@ajayyy/maze-utils/lib/tab-updates";
import { setupBackgroundRequestProxy } from "@ajayyy/maze-utils/lib/background-request-proxy";
import { generateUserID } from "@ajayyy/maze-utils/lib/setup";
import Config from "./config";

setupTabUpdates(Config);
setupBackgroundRequestProxy();

chrome.runtime.onInstalled.addListener(function () {
    // This let's the config sync to run fully before checking.
    // This is required on Firefox
    setTimeout(() => {
        const userID = Config.config!.userID;

        // If there is no userID, then it is the first install.
        if (!userID){
            //open up the install page
            void chrome.tabs.create({url: chrome.extension.getURL("/help/index.html")});

            const newUserID = generateUserID();
            Config.config!.userID = newUserID;
        }
    }, 1500);
});
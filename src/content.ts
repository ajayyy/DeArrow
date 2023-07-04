import { replaceCurrentVideoBranding, setupOptionChangeListener, startThumbnailListener } from "./videoBranding/videoBranding";
import { setupCBVideoModule } from "./video";
import { addTitleChangeListener, listenForBadges, listenForMiniPlayerTitleChange, listenForTitleChange } from "./utils/titleBar";
import { logError } from "./utils/logger";
import { addCssToPage } from "./utils/cssInjector";
import { runCompatibilityFunctions } from "./utils/extensionCompatibility";

addCssToPage();
setupCBVideoModule();

startThumbnailListener();
listenForBadges().catch(logError);
listenForTitleChange().catch(logError);
listenForMiniPlayerTitleChange().catch(logError);
addTitleChangeListener(() => void replaceCurrentVideoBranding().catch(logError));
setupOptionChangeListener();

runCompatibilityFunctions();
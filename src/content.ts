import { replaceCurrentVideoBranding, setupOptionChangeListener, startThumbnailListener } from "./videoBranding/videoBranding";
import { setupCBVideoModule } from "./video";
import { addTitleChangeListener, listenForBadges, listenForTitleChange } from "./utils/titleBar";
import { logError } from "./utils/logger";
import { addCssToPage } from "./utils/cssInjector";

addCssToPage();
setupCBVideoModule();

startThumbnailListener();
listenForBadges().catch(logError);
listenForTitleChange().catch(logError);
addTitleChangeListener(() => void replaceCurrentVideoBranding().catch(logError));
setupOptionChangeListener();
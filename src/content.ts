import { replaceCurrentVideoBranding, setupOptionChangeListener, startThumbnailListener } from "./videoBranding/videoBranding";
import { setupCBVideoModule } from "./video";
import { addTitleChangeListener, listenForBadges, listenForMiniPlayerTitleChange, listenForTitleChange } from "./utils/titleBar";
import { logError } from "./utils/logger";
import { addCssToPage } from "./utils/cssInjector";
import { setupPageTitleHandler } from "./titles/pageTitleHandler";

addCssToPage();
setupCBVideoModule();

startThumbnailListener();
setupPageTitleHandler().catch(logError);
listenForBadges().catch(logError);
listenForTitleChange().catch(logError);
listenForMiniPlayerTitleChange().catch(logError);
addTitleChangeListener(() => void replaceCurrentVideoBranding().catch(logError));
setupOptionChangeListener();
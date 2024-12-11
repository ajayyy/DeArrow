import { replaceCurrentVideoBranding, setupOptionChangeListener, startThumbnailListener } from "./videoBranding/videoBranding";
import { setupCBVideoModule } from "./video";
import { addTitleChangeListener, listenForBadges, listenForMiniPlayerTitleChange, listenForTitleChange, setupTitlebarCleanup } from "./utils/titleBar";
import { logError } from "./utils/logger";
import { addCssToPage } from "./utils/cssInjector";
import { runCompatibilityFunctions } from "./utils/extensionCompatibility";
import { cleanPage } from "./utils/pageCleaner";
import { setupPageTitleHandler } from "./titles/pageTitleHandler";
import { setupWatchPageBrandingCleanup } from "./videoBranding/watchPageBrandingHandler";
import { addHotkeyListener } from "./utils/keybinds";
import { setupNotificationHandler } from "./videoBranding/notificationHandler";

cleanPage();
addCssToPage();
setupCBVideoModule();

startThumbnailListener();
listenForBadges().catch(logError);
listenForTitleChange().catch(logError);
listenForMiniPlayerTitleChange().catch(logError);
addTitleChangeListener(() => void replaceCurrentVideoBranding().catch(logError));
setupOptionChangeListener();
setupPageTitleHandler();
addHotkeyListener();
setupNotificationHandler().catch(logError);

setupTitlebarCleanup();
setupWatchPageBrandingCleanup();

runCompatibilityFunctions();
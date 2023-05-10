import { replaceCurrentVideoBranding, setupExtensionEnabledListener, startThumbnailListener } from "./videoBranding/videoBranding";
import { setupCBVideoModule } from "./video";
import { addTitleChangeListener, listenForBadges, listenForTitleChange } from "./utils/titleBar";
import { logError } from "./utils/logger";

setupCBVideoModule();

startThumbnailListener();
listenForBadges().catch(logError);
listenForTitleChange().catch(logError);
addTitleChangeListener(() => void replaceCurrentVideoBranding().catch(logError));
setupExtensionEnabledListener();
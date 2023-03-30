import { startThumbnailListener } from "./videoBranding/videoBranding";
import { setupCBVideoModule } from "./video";
import { listenForBadges } from "./utils/titleBar";
import { logError } from "./utils/logger";

setupCBVideoModule();

startThumbnailListener();
listenForBadges().catch(logError);
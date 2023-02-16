import { setupTabUpdates } from "@ajayyy/maze-utils/lib/tab-updates";
import { setupBackgroundRequestProxy } from "@ajayyy/maze-utils/lib/background-request-proxy";
import Config from "./config";

setupTabUpdates(Config);
setupBackgroundRequestProxy();
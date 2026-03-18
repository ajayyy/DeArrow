import { FetchResponse, sendRequestToCustomServer } from "../../maze-utils/src/background-request-proxy";
import Config from "../config/config";
import * as CompileConfig from "../../config.json";

export function sendRequestToServer(type: string, url: string, data = {}): Promise<FetchResponse> {
    return sendRequestToCustomServer(type, Config.config?.serverAddress ?? CompileConfig.serverAddress + url, data);
}

import * as CompileConfig from "../../config.json";

export function logError(...vals: unknown[]): void {
    console.error("[CB]", ...vals);
}

export function log(...text: unknown[]): void {
    if (CompileConfig.debug) {
        console.log(...text);
    } else {
        window["CBLogs"] ??= [];
        window["CBLogs"].push({
            time: Date.now(),
            text
        });

        if (window["CBLogs"].length > 100) {
            window["CBLogs"].shift();
        }
    }
}

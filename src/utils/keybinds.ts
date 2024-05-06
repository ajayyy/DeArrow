import { addCleanupListener } from "../../maze-utils/src/cleanup";
import { Keybind, keybindEquals } from "../../maze-utils/src/config";
import Config from "../config/config";
import { submitButton } from "../video";
import { logError } from "./logger";

function hotkeyListener(e: KeyboardEvent): void {
    const currentTag = document.activeElement?.tagName?.toLowerCase();

    if (currentTag && ["textarea", "input"].includes(currentTag)
        || document.activeElement?.id?.toLowerCase()?.includes("editable")) return;

    const key: Keybind = {
        key: e.key,
        code: e.code,
        alt: e.altKey,
        ctrl: e.ctrlKey,
        shift: e.shiftKey
    };


    if (keybindEquals(key, Config.config!.openMenuKey)) {
        submitButton.openOrClose().catch(logError);
        return;
    } else if (keybindEquals(key, Config.config!.enableDeArrowKey)) {
        Config.config!.extensionEnabled = !Config.config!.extensionEnabled;
        return;
    }
}

export function addHotkeyListener(): void {
    document.addEventListener("keydown", hotkeyListener);

    const onLoad = () => {
        // Allow us to stop propagation to YouTube by being deeper
        document.removeEventListener("keydown", hotkeyListener);
        document.body.addEventListener("keydown", hotkeyListener);

        addCleanupListener(() => {
            document.body.removeEventListener("keydown", hotkeyListener);
        });
    };

    if (document.readyState === "complete") {
        onLoad();
    } else {
        document.addEventListener("DOMContentLoaded", onLoad);
    }
}
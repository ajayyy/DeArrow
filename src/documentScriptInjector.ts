import * as documentScript from "../dist/js/document.js";
import { injectScript } from "../maze-utils/src/scriptInjector";

if (chrome.runtime.getManifest().manifest_version === 2) {
    injectScript(documentScript)
}
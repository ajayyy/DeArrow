import { isFirefoxOrSafari } from "../maze-utils/src";
import { cleanPage } from "./utils/pageCleaner";

if (isFirefoxOrSafari()) {
    cleanPage();

    const possibleHiddenElements = document.querySelectorAll("img");
    for (const element of possibleHiddenElements) {
        if (element.style.display === "none") {
            element.style.removeProperty("display");
        }
    }
}

let warningElement: HTMLElement | null = document.getElementById("dearrow-unactivated-warning");
closeWarningButton();

if (document.hasFocus()) {
    displayWarningIfNeeded();
} else {
    window.addEventListener("mousemove", displayWarningIfNeeded, { once: true });
}




function displayWarningIfNeeded() {
    chrome.storage.sync.get(["activated", "freeTrialStart", "freeTrialEnded", "freeAccessRequestStart"], (v) => {
        if (!v.activated && !v.freeTrialStart && !v.freeTrialEnded && !v.freeAccessRequestStart) {
            const addWarningElement = () => {
                warningElement = document.createElement("div");
                warningElement.id = "dearrow-unactivated-warning";
                warningElement.style.position = "fixed";
                warningElement.style.top = "0";
                warningElement.style.left = "0";
                warningElement.style.right = "0";
                warningElement.style.display = "flex";
                warningElement.style.alignItems = "center";
                warningElement.style.justifyContent = "center";
                warningElement.style.flexDirection = "column";
                warningElement.style.backgroundColor = "#171717";
                warningElement.style.zIndex = "10000000";
                warningElement.style.padding = "20px";
        
                const icon = document.createElement("img");
                icon.src = chrome.runtime.getURL("icons/logo.svg");
                icon.style.width = "30px";
        
                const text = document.createElement("span");
                text.innerText = chrome.i18n.getMessage("DeArrowNotActivated");
                text.style.color = "white";
                text.style.fontSize = "17px";
                text.style.padding = "20px";
        
                const activateButton = createButton(chrome.i18n.getMessage("ActivateDeArrow"));
                activateButton.addEventListener("click", () => {
                    void chrome.runtime.sendMessage({ message: "openPayment" });
                });
        
                const closeButton = createButton(chrome.i18n.getMessage("Close"));
                closeButton.addEventListener("click", closeWarningButton);
        
                warningElement.appendChild(icon);
                warningElement.appendChild(text);
                warningElement.appendChild(activateButton);
                warningElement.appendChild(closeButton);
        
                document.body.appendChild(warningElement);
        
                chrome.storage.sync.onChanged.addListener((changes) => {
                    if (changes.activated || changes.freeTrialStart || changes.freeTrialEnded || changes.freeAccessRequestStart) {
                        closeWarningButton();
                    }
                });
            };
            
            if (document.readyState === "complete") {
                addWarningElement();
            } else {
                window.addEventListener("DOMContentLoaded", addWarningElement);
            }
        }
    });
}

function createButton(text: string): HTMLElement {
    const button = document.createElement("div");
    button.innerText = text;
    button.style.cursor = "pointer";
    button.style.backgroundColor = "#0e79ca";
    button.style.color = "white";
    button.style.padding = "10px";
    button.style.borderRadius = "5px";
    button.style.fontSize = "14px";
    button.style.width = "max-content";
    button.style.marginBottom = "10px";

    return button;
}

function closeWarningButton() {
    if (warningElement) {
        warningElement.remove();
        warningElement = null;
    }
}
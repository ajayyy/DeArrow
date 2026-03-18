import { askBackgroundToRegisterNeededContentScripts, shouldAllowLicenseKey } from "./license/license";

const licenseKey = window.location.hash.match(/key=([^=&]+)/)?.[1];
if (licenseKey) {
    // Activate with this license key
    window.addEventListener("DOMContentLoaded", () => document.body.innerHTML = "");

    const installElement = document.createElement("div");
    installElement.id = "extensionInstalled";
    document.documentElement.appendChild(installElement);
    void (async () => {

        if (await shouldAllowLicenseKey(licenseKey)) {
            chrome.storage.sync.set({
                licenseKey: licenseKey,
                activated: true
            }, () => {
                void askBackgroundToRegisterNeededContentScripts(true).then(() => {
                    window.location.replace(chrome.runtime.getURL("/help.html"));
                })
            });
        } else {
            goToPaymentPage();
        }
    })()
} else if (window.location.pathname.startsWith("/payment")) {
    goToPaymentPage();
}

function goToPaymentPage() {
    window.location.replace(chrome.runtime.getURL("/payment.html"));
}
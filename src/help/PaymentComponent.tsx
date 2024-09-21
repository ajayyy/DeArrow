import * as React from "react";
import { sendRequestToServer } from "../utils/requests";
import { askBackgroundToRegisterNeededContentScripts, askBackgroundToSetupAlarms, freeTrialActive, isFreeAccessRequestActive } from "../license/license";
import Config from "../config/config";
import { objectToURI } from "../../maze-utils/src";
import { waitFor } from "../../maze-utils/src";

const websiteDomain = "https://dearrow.ajay.app"

interface PaymentComponentChoices {
    freeTrial?: boolean;
    freeTrialDuration? : number;
    licenseKey?: string;
    freeAccess?: boolean;
    freeInstantAccess?: boolean;
    freeAccessWaitingPeriod? : number;
}

enum PaymentResultMessageType {
    FreeTrial,
    FreeAccess
}

let openedTab = false;
waitFor(() => Config.isReady()).then(() => {
    if (Config.config!.activated && !openedTab) {
        openedTab = true;
        chrome.runtime.sendMessage({ "message": "openHelp" }, () => window.close());
    }
});

Config.configSyncListeners.push((changes) => {
    if (!openedTab && ((changes.activated && changes.activated.newValue)
        || (changes.alreadyActivated && changes.alreadyActivated.newValue))) {
        Config.config!.activated = true;
        openedTab = true;

        chrome.runtime.sendMessage({ "message": "openHelp" }, () => window.close());
    }
});

export const PaymentComponent = () => {
    const [paymentResult, setPaymentResult] = React.useState<PaymentResultMessageType | null>(isFreeAccessRequestActive() 
        ? PaymentResultMessageType.FreeAccess : (freeTrialActive() ? PaymentResultMessageType.FreeTrial : null));
    const [hideFrame, setHideFrame] = React.useState(true);

    const [redeemEnabled, setRedeemEnabled] = React.useState(false);

    const iframeSource = React.useRef(`${websiteDomain}/payment#${objectToURI("", {
        freeTrialActive: freeTrialActive(),
        hideRequestFreeAccessButton: Config.config!.freeAccessRequestStart !== null,
        hideRedeem: true
    }, false)}`);

    const applyChoices = async (choices: PaymentComponentChoices) => {
        if (Config.config!.freeTrialStart && !Config.config!.freeTrialEnded) {
            // Can't have two trials at once
            choices.freeTrial = false;
        }

        const validLicenseKey = choices.licenseKey && await shouldAllowLicenseKey(choices.licenseKey);
        if (validLicenseKey) {
            Config.config!.licenseKey = choices.licenseKey!;
        } else if (choices.licenseKey) {
            alert(chrome.i18n.getMessage("redeemFailed"));
        }

        if (choices.freeAccess) {
            if (choices.freeInstantAccess) {
                Config.config!.activated = true;
                Config.config!.freeActivation = true;
            } else {
                Config.config!.freeAccessRequestStart = Date.now();
    
                if (choices.freeAccessWaitingPeriod) {
                    Config.config!.freeAccessWaitingPeriod = choices.freeAccessWaitingPeriod;
                }
            }
        }

        if (validLicenseKey) {
            Config.config!.activated = true;
        } else {
            if (choices.freeAccess) {
                setPaymentResult(PaymentResultMessageType.FreeAccess)
            } else if (choices.freeTrial) {
                setPaymentResult(PaymentResultMessageType.FreeTrial)
                Config.config!.freeTrialStart = Date.now();
                Config.config!.freeTrialEnded = false;

                if (choices.freeTrialDuration) {
                    Config.config!.freeTrialDuration = choices.freeTrialDuration;
                }
            }

            window.scrollTo(0, 0);
        }

        if (validLicenseKey || choices.freeTrial || Config.config!.activated) {
            await askBackgroundToRegisterNeededContentScripts(true);
        } else if (choices.freeAccess) {
            setTimeout(() => void askBackgroundToSetupAlarms(), 2000);
        }

        if (validLicenseKey && !openedTab) {
            openedTab = true;
            setTimeout(() => chrome.runtime.sendMessage({ "message": "openHelp" }, () => window.close()), 200);
        }
    }

    React.useEffect(() => {
        window.addEventListener("message", (e) => {
            if (e.data && e.data.message === "dearrow-payment-page-data") {
                applyChoices(e.data.choices);
            }
        });

        setTimeout(() => setHideFrame(false), 300);
    }, []);

    return (
        <>
            <div id="title">
                <img src="icons/logo-256.png" height="80" className="profilepic" />
                <span id="titleText">
                    DeArrow
                </span>
            </div>

            <div className="container sponsorBlockPageBody" style={{
                maxWidth: "768px"
            }}>

                <p className="createdBy">
                    <img src="https://ajay.app/newprofilepic.jpg" height="30" className="profilepiccircle" />
                    {chrome.i18n.getMessage("createdBy")}{" "}<a href="https://ajay.app">Ajay Ramachandran</a>
                </p>

                {
                    !Config.config!.activated &&
                    <div className="center row-item redeem-box">
                        <input 
                            id="redeemCodeInput" 
                            className="option-text-box" 
                            type="text" 
                            placeholder="Enter license key"
                            onChange={(e) => {
                                setRedeemEnabled(e.target.value.length > 0);
                            }}/>

                        <a
                            className="option-link" 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={() => {
                                if (!redeemEnabled) return;
                                applyChoices({
                                    licenseKey: (document.getElementById("redeemCodeInput") as HTMLInputElement).value
                                })
                            }}>
                            <div className={"option-button side-by-side inline" + (!redeemEnabled ? " disabled" : "")}>
                                Redeem
                            </div>
                        </a>
                    </div>
                }

                <div className="payment-announcement-container">
                    <div className="payment-announcement center">
                        {
                            !freeTrialActive() && Config.config!.freeTrialEnded &&
                                <p>
                                    {chrome.i18n.getMessage("freeTrialEnded")}
                                </p>
                        }
                    </div>

                    {
                        paymentResult === PaymentResultMessageType.FreeAccess ? (
                            <div className="payment-announcement center">
                                <p>
                                    {chrome.i18n.getMessage("freeAccessRequested")}
                                </p>

                                {
                                    Config.config!.freeTrialStart === null && !Config.config!.freeTrialEnded &&
                                    <>
                                        <p>
                                            {chrome.i18n.getMessage("freeTrialPrompt")}
                                        </p>

                                        <div>
                                            <div className="option-button center-button" 
                                                onClick={() => {
                                                    applyChoices({
                                                        freeTrial: true
                                                    });
                                                }}>
                                                {chrome.i18n.getMessage("startFreeTrial")}
                                            </div>
                                        </div>
                                    </>
                                }

                                {
                                    freeTrialActive() &&
                                        <p>
                                            {chrome.i18n.getMessage("freeTrialStarted")}
                                        </p>
                                }
                                
                                <br/>
                                <br/>
                            </div>
                        ) : (paymentResult === PaymentResultMessageType.FreeTrial ? (
                            <>
                                <div className="payment-announcement center">
                                    <p>
                                        {chrome.i18n.getMessage("freeTrialStarted")}
                                    </p>
                                </div>

                                <br/>
                                <br/>
                            </>
                        ): null)
                    }
                </div>

                <iframe
                    key="main-frame"
                    className={hideFrame ? "hidden" : ""}
                    src={iframeSource.current}
                    style={{
                        border: "none",
                        width: "100%",
                        height: "1600px"
                    }}
                    onLoad={(e) => {
                        setHideFrame(false);
                        const frame = e.currentTarget as HTMLIFrameElement;
                        setTimeout(() => frame.contentWindow!.postMessage("dearrow-payment-page", "*"), 100);
                        setTimeout(() => frame.contentWindow!.postMessage("dearrow-payment-page", "*"), 1500);
                    }}
                />
            </div>
        </>
    );
};

async function shouldAllowLicenseKey(licenseKey: string): Promise<boolean> {
    try {
        const result = await sendRequestToServer("GET", `/api/verifyToken`, {
            licenseKey: licenseKey
        });

        if (result.status === 200) {
            const json = JSON.parse(result.responseText);
            return json.allowed;
        } else {
            return true;
        }
    } catch (e) { } // eslint-disable-line no-empty

    return true;
}
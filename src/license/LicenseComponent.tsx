import * as React from "react";
import { getLicenseKey } from "./license";

export const LicenseComponent = () => {
    const [showLicenseKey, setShowLicenseKey] = React.useState(false);
    const [licenseKey, setLicenseKey] = React.useState<string | null>(null);

    React.useEffect(() => {
        (async () => {
            setLicenseKey(await getLicenseKey());
        })();
    }, []);

    return (
        <div>
            {
                licenseKey &&
                <div className="license-key-button"
                    onClick={() => {
                        setShowLicenseKey(!showLicenseKey);
                    }}>
                    {chrome.i18n.getMessage("ViewLicenseKey")}
                </div>
            }

            {
                showLicenseKey &&
                <>
                    <div className="license-key-text">
                        {licenseKey}
                    </div>
                    <div className="license-key-text">
                        ({chrome.i18n.getMessage("SharingIsCaring")})
                    </div>
                </>
            }
    
        </div>
    );
};
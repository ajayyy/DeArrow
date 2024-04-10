import * as React from "react";
import { getLicenseKey } from "./license";
import { FormattedText } from "../popup/FormattedTextComponent";
import { TitleFormatting } from "../../maze-utils/src/titleFormatter";

interface LicenseComponentProps {
    titleFormatting?: TitleFormatting;
}

export const LicenseComponent = ({ titleFormatting }: LicenseComponentProps) => {
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
                    <FormattedText
                        langKey="ViewLicenseKey"
                        titleFormatting={titleFormatting}
                    />
                </div>
            }

            {
                showLicenseKey &&
                <>
                    <div className="license-key-text">
                        {licenseKey}
                    </div>
                    <div className="license-key-text">
                        <FormattedText
                            langKey="SharingIsCaring"
                            titleFormatting={titleFormatting}
                        />
                    </div>
                </>
            }

        </div>
    );
};

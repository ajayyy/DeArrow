import * as React from "react";
import { createRoot } from 'react-dom/client';
import { ChannelOverridesComponent } from "./ChannelOverridesComponent";

class ChannelOverrides {

    constructor(element: Element) {
        const root = createRoot(element);
        root.render(
            <ChannelOverridesComponent />
        );
    }
}

export default ChannelOverrides;
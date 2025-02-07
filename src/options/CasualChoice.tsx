import * as React from "react";
import { createRoot } from 'react-dom/client';
import { CasualChoiceComponent } from "./CasualChoiceComponent";

class CasualChoice {

    constructor(element: Element) {
        const root = createRoot(element);
        root.render(
            <CasualChoiceComponent />
        );
    }
}

export default CasualChoice;
import * as React from "react";
import { createRoot } from "react-dom/client";
import { PopupComponent } from "./PopupComponent";


document.addEventListener("DOMContentLoaded", () => {
    const root = createRoot(document.body);
    root.render(<PopupComponent/>);
})
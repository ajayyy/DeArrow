import * as React from "react";
import { createRoot } from "react-dom/client";
import { waitFor } from "../../maze-utils/src";
import Config from "../config/config";
import { PaymentComponent } from "./PaymentComponent";


document.addEventListener("DOMContentLoaded", async () => {
    await waitFor(() => Config.isReady());

    const root = createRoot(document.body);
    root.render(<PaymentComponent/>);
})
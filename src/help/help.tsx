import * as React from "react";
import { createRoot } from "react-dom/client";
import { HelpComponent } from "./HelpComponent";
import { waitFor } from "@ajayyy/maze-utils";
import Config from "../config";


document.addEventListener("DOMContentLoaded", async () => {
    await waitFor(() => Config.isReady());

    const root = createRoot(document.body);
    root.render(<HelpComponent/>);
})
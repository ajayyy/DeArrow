import { waitFor } from "@ajayyy/maze-utils";
import { getYouTubeTitleNode } from "@ajayyy/maze-utils/lib/elements";

export async function getOrCreateTitleButtonContainer(): Promise<HTMLElement | null> {
    const titleNode = await waitFor(() => getYouTubeTitleNode());
    const referenceNode = titleNode?.parentElement;

    if (referenceNode) {
        let titleButtonContainer = document.querySelector(".cbTitleButtonContainer") as HTMLElement;
        if (!titleButtonContainer) {
            titleButtonContainer = document.createElement("div");
            titleButtonContainer.classList.add("cbTitleButtonContainer");
            referenceNode.appendChild(titleButtonContainer);

            // Buttons on right
            referenceNode.style.display = "flex";
            referenceNode.style.justifyContent = "space-between";
        }

        return titleButtonContainer;
    }

    return null;
}
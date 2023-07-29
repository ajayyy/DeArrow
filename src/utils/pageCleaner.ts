export function cleanPage() {
    // For live-updates
    if (document.readyState === "complete") {
        for (const element of document.querySelectorAll(".cbShowOriginal, .cb-css")) {
            element.remove();
        }
    }
}
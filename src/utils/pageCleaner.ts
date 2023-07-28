export function cleanPage() {
    // For live-updates
    for (const element of document.querySelectorAll(".cbShowOriginal, .cb-css")) {
        element.remove();
    }
}
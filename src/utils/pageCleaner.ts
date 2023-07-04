export function cleanPage() {
    // For live-updates on Firefox
    for (const element of document.querySelectorAll(".cbShowOriginal, .cb-css")) {
        element.remove();
    }
}
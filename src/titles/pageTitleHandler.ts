let targetTitle: string | null = "";

/**
 * forFuture indicates not to change the title right away, and wait for the next yt-update-title event to handle it
 * 
 * Used for resetting the title to the original title without having the old video title come back
 */
export function setPageTitle(title: string) {
    if (title === targetTitle) return;

    changePageTitleNow(title);
    targetTitle = title;
}

function changePageTitleNow(title: string) {
    if (document.title !== title) {
        const app = document.querySelector("ytd-app");
        if (app) {
            app.dispatchEvent(new CustomEvent("yt-update-title", { detail: title }));
        }
    }
}
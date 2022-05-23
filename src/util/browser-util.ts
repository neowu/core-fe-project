import {app} from "../app";

let navigationBlockedMessage: string = "Are you sure to leave current page?";
let navigationBlockRemover: undefined | (() => void) = undefined;

export function isIEBrowser(): boolean {
    return navigator.userAgent.indexOf("MSIE") > 0 || navigator.userAgent.indexOf("Trident/") > 0;
}

export function setNavigationBlockedMessage(message: string | null | undefined): void {
    if (message) {
        navigationBlockedMessage = message;
    }
}

export function blockNavigation(): void {
    window.onbeforeunload = () => navigationBlockedMessage;
    navigationBlockRemover = app.browserHistory.block((transaction) => {
        if (window.confirm(navigationBlockedMessage)) {
            setTimeout(allowNavigation, 0);
            transaction.retry();
        }
    });
}

export function allowNavigation() {
    window.onbeforeunload = null;
    navigationBlockRemover?.();
    navigationBlockRemover = undefined;
}

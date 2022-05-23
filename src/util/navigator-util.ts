export function isIEBrowser() {
    return navigator.userAgent.indexOf("MSIE") > 0 || navigator.userAgent.indexOf("Trident/") > 0;
}

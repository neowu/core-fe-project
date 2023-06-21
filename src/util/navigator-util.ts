export function isBrowserSupported() {
    const isIE = navigator.userAgent.indexOf("MSIE") > 0 || navigator.userAgent.indexOf("Trident/") > 0;
    if (isIE) return false;

    const proxySupported = typeof Proxy === "function"; // Required by immer
    if (!proxySupported) return false;

    return true;
}

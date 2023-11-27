export function isBrowserSupported() {
    const isIE = navigator.userAgent.indexOf("MSIE") > 0 || navigator.userAgent.indexOf("Trident/") > 0;
    if (isIE) return false;

    const proxySupported = typeof Proxy === "function"; // required by immer
    if (!proxySupported) return false;

    const shadowRootSupported = typeof ShadowRoot === "function"; // required by antd
    if (!shadowRootSupported) return false;

    return true;
}

export function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function generateUniqueId() {
    // A UUID for current visitor, based on:
    // - Current time (in millisecond)
    // - Some random number (around 1000~10000000)
    // E.g: 169e68f80c9-1b4104
    return new Date().getTime().toString(16) + "-" + Math.floor(Math.random() * 9999900 + 1000).toString(16);
}

// TODO
/**
 * CAVEAT:
 * In Apple Safari, localStorage/client-side cookie values are subject to 7-day expiration.
 * Therefore, in order for real persistence, we prefer using server-side cookie, over localStorage.
 * Ref: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
 */
function getVisitorId() {
    try {
        const token = "@@framework-visitor-id";
        const previousId = localStorage.getItem(token);
        if (previousId) {
            return previousId;
        } else {
            const newId = generateUniqueId();
            localStorage.setItem(token, newId);
            return newId;
        }
    } catch (e) {
        return generateUniqueId();
    }
}

/**
 * CAVEAT:
 * In Apple Safari, the user may block sessionStorage access via setting "Block All Cookies".
 * The following code will throw error in such case.
 * Ref: https://codingrepo.com/javascript/2018/11/15/safari-securityerror-dom-exception-18-thrown-by-localstorage-or-cookies-are-blocked/
 */
function getSessionId() {
    try {
        const token = "@@framework-session-id";
        const previousId = sessionStorage.getItem(token);
        if (previousId) {
            return previousId;
        } else {
            const newId = generateUniqueId();
            sessionStorage.setItem(token, newId);
            return newId;
        }
    } catch (e) {
        return generateUniqueId();
    }
}

export const loggerContext = {
    requestURL: () => location.href,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
};

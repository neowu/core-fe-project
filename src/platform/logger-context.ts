import {uuid} from "../util/uuid";

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
            const newId = uuid();
            sessionStorage.setItem(token, newId);
            return newId;
        }
    } catch (e) {
        return uuid();
    }
}

export const loggerContext = {
    request_url: () => location.href,
    session_id: getSessionId(),
};

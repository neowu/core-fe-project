import {ExceptionPayload} from "../reducer";
import {RuntimeException} from "../Exception";

export function serializeError(errorObject: any): string {
    if (errorObject) {
        const jsonString = JSON.stringify(errorObject);
        let message = typeof errorObject.toString === "function" ? errorObject.toString() + "\n" : "";
        if (jsonString.length > 300) {
            // Over-long message may lead to Chrome crash, or server-side drop request
            message += jsonString.substr(0, 300) + "...";
        } else {
            message += jsonString;
        }
        return message;
    } else {
        return "[NULL]";
    }
}

export function shouldAlertToUser(exceptionPayload: ExceptionPayload): boolean {
    if (process.env.NODE_ENV === "production") {
        const {exception} = exceptionPayload;
        if (exception instanceof RuntimeException) {
            const errorMessage = exception.message;
            if (errorMessage.includes("Refused to send beacon")) {
                /**
                 * Typical issue:
                 * Unhandled Promise Rejection: SecurityError: Failed to execute 'sendBeacon' on 'Navigator': Refused to send beacon to 'https://track.uc.cn/collect?...'
                 *
                 * Happens in Android UC browser, because of auto user-behavior tracking.
                 *
                 * ATTENTION:
                 * This error may occur while calling setHistory (because the UC browser overwrites history API).
                 * In such case, exception.actionName is not undefined.
                 */
                return false;
            } else if (errorMessage.includes("vivoNewsDetailPage.getNewsReadStatus4Vivo")) {
                /**
                 * Typical issue:
                 * Uncaught TypeError: vivoNewsDetailPage.getNewsReadStatus4Vivo is not a function
                 *
                 * Happens in Vivo Android browser, because of its own plugin.
                 */
                return false;
            } else if (errorMessage.includes("Loading chunk") || errorMessage.includes("Loading CSS chunk")) {
                /**
                 * Typical issue:
                 * http://kube.pinnacle-gaming.com:30107/app/kibana#/doc/event-pattern/event-*?id=6F8351282DC640433269&_g=()
                 * http://kube.jianfengdemo-g.com:30102/app/kibana#/doc/event-pattern/event-*?id=6F656544FD585A83D7A7&_g=()
                 *
                 * Network error while downloading JavaScript/CSS (async loading).
                 * In such case, exception.actionName might be "changeTheme", "@@ENTER".
                 *
                 * This works with webpack 4.41
                 */
                return false;
            } else if (!exceptionPayload.actionName) {
                if (errorMessage.includes("is not defined")) {
                    /**
                     * Typical issue:
                     * _start is not undefined
                     * hasInject is not undefined
                     *
                     * Happens in some Android browser, possibly script injection.
                     */
                    return false;
                } else if (errorMessage.includes("Refused to evaluate a string as JavaScript")) {
                    /**
                     * Typical issue:
                     * Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src ...".
                     *
                     * Happens in some Mac Chrome, possibly Chrome extensions.
                     */
                    return false;
                } else if (!exception.errorObject && errorMessage.includes("Script error")) {
                    /**
                     * Typical issue:
                     * http://kube.pinnacle-gaming.com:30102/app/kibana#/doc/event-pattern/event-*?id=6DF21AC79CA780471D5A&_g=()
                     *
                     * Happens in Xiaomi Android browser, no extra info.
                     */
                    return false;
                }
            }
        }
    }
    return true;
}

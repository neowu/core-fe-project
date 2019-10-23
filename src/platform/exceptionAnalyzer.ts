import {ExceptionPayload} from "../reducer";
import {RuntimeException} from "../Exception";

export function shouldHandle(exceptionPayload: ExceptionPayload): boolean {
    if (process.env.NODE_ENV === "production" && !exceptionPayload.actionName) {
        const {exception} = exceptionPayload;
        if (exception instanceof RuntimeException) {
            const errorMessage = exception.message;
            if (errorMessage.includes("is not defined")) {
                /**
                 * Typical issue:
                 * _start is not undefined
                 * hasInject is not undefined
                 *
                 * Happens in some Android browser, possibly script injection.
                 */
                return false;
            }

            if (errorMessage.includes("Refused to evaluate a string as JavaScript")) {
                /**
                 * Typical issue:
                 * Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src ...".
                 *
                 * Happens in some Mac Chrome, possibly Chrome extensions.
                 */
                return false;
            }

            if (errorMessage.includes("Refused to send beacon to")) {
                /**
                 * Typical issue:
                 * Unhandled Promise Rejection: SecurityError: Failed to execute 'sendBeacon' on 'Navigator': Refused to send beacon to 'https://track.uc.cn/collect?...'
                 *
                 * Happens in Android UC browser, because of auto user-behavior tracking.
                 */
                return false;
            }

            if (errorMessage.includes("vivoNewsDetailPage.getNewsReadStatus4Vivo")) {
                /**
                 * Typical issue:
                 * Uncaught TypeError: vivoNewsDetailPage.getNewsReadStatus4Vivo is not a function
                 *
                 * Happens in Vivo Android browser, because of its own plugin.
                 */
                return false;
            }

            if (exception.errorObject === null && errorMessage.includes("Script error")) {
                /**
                 * Typical issue:
                 * http://kube.pinnacle-gaming.com:30102/app/kibana#/doc/event-pattern/event-*?id=6DF21AC79CA780471D5A&_g=()
                 *
                 * Happens in Xiaomi Android browser, no extra info.
                 */
                return false;
            }

            if (errorMessage.includes("ChunkLoadError")) {
                /**
                 * Typical issue:
                 * http://kube.pinnacle-gaming.com:30102/app/kibana#/doc/event-pattern/event-*?id=6DF21AC79CA780471D5A&_g=()
                 *
                 * Network error while downloading JavaScript (async loading).
                 */
                return false;
            }
        }
    }
    return true;
}

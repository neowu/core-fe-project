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
                 * Happens in some Mac Chrome, cannot figure out detailed reason now.
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
        }
    }
    return true;
}

import {Exception, JavaScriptException} from "../Exception";
import {ErrorHandler} from "../module";

/**
 * @param originalError should be excluded from Exception type.
 */
export function serializeOriginalError(originalError: any): {name: string; message: string} {
    let name = "Error";
    let message = "Unknown";
    if (originalError) {
        name = originalError.name || "-";
        message = originalError.message || "-";
    }
    return {name, message};
}

export function originalErrorToException(originalError: any): Exception {
    if (originalError instanceof Exception) {
        return originalError;
    } else {
        const {name, message} = serializeOriginalError(originalError);
        return new JavaScriptException(message, name);
    }
}

let isUserErrorHandlerRunning = false;
export function* runUserErrorHandler(handler: ErrorHandler, exception: Exception) {
    if (isUserErrorHandlerRunning) return;

    try {
        isUserErrorHandlerRunning = true;
        yield* handler(exception);
    } catch (e) {
        console.error("Error Caught In Error Handler", e);
    } finally {
        isUserErrorHandlerRunning = false;
    }
}

export function shouldAlertToUser(errorMessage: string): boolean {
    if (process.env.NODE_ENV === "production") {
        if (errorMessage.includes("Refused to send beacon")) {
            /**
             * Typical issue:
             * Unhandled Promise Rejection: SecurityError: Failed to execute 'sendBeacon' on 'Navigator': Refused to send beacon to 'https://track.uc.cn/collect?...'
             *
             * Happens in Android UC browser, because of auto user-behavior tracking.
             */
            return false;
        } else if (errorMessage.includes("vivoNewsDetailPage")) {
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
             */
            return false;
        } else if (errorMessage.includes("is not defined")) {
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
        } else if (errorMessage.includes("Script error")) {
            /**
             * Typical issue:
             * http://kube.pinnacle-gaming.com:30102/app/kibana#/doc/event-pattern/event-*?id=6DF21AC79CA780471D5A&_g=()
             *
             * Happens in Xiaomi Android browser, no extra info.
             */
            return false;
        }
    }
    return true;
}

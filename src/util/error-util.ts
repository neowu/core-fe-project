import {Exception, JavaScriptException} from "../Exception";
import {ErrorHandler} from "../module";
import {app} from "../app";
import {isIEBrowser} from "./navigator-util";

interface ErrorExtra {
    triggeredBy: "detached-saga" | "saga" | "error-boundary" | "promise-rejection" | "global";
    actionPayload?: string; // Should be masked
    extraStacktrace?: string;
}

export function errorToException(error: any): Exception {
    if (error instanceof Exception) {
        return error;
    } else if (error instanceof Error) {
        return new JavaScriptException(error.message);
    } else {
        try {
            const errorMessage = JSON.stringify(error);
            return new JavaScriptException(errorMessage);
        } catch (e) {
            return new JavaScriptException("[Unknown Error]");
        }
    }
}

export function captureError(error: any, extra: ErrorExtra, action?: string): Exception {
    if (process.env.NODE_ENV === "development") {
        console.error(`[framework] Error captured from [${extra.triggeredBy}]`, error);
    }

    const exception = errorToException(error);
    const errorStacktrace = error instanceof Error ? error.stack : undefined;
    const jsErrorType = error instanceof Error ? error.name : undefined;
    app.logger.exception(exception, {...extra, stacktrace: errorStacktrace, jsErrorType}, action);

    if (shouldAlertToUser(exception.message)) {
        app.sagaMiddleware.run(runUserErrorHandler, app.errorHandler, exception);
    }

    return exception;
}

let isUserErrorHandlerRunning = false;
export function* runUserErrorHandler(handler: ErrorHandler, exception: Exception) {
    if (isUserErrorHandlerRunning) return;

    try {
        isUserErrorHandlerRunning = true;
        yield* handler(exception);
    } catch (e) {
        console.warn("[framework] Fail to execute user-defined error handler", e);
    } finally {
        isUserErrorHandlerRunning = false;
    }
}

export function shouldAlertToUser(errorMessage: string): boolean {
    if (process.env.NODE_ENV === "production") {
        if (isIEBrowser()) {
            return false;
        }

        if (errorMessage.includes("Refused to send beacon") || errorMessage.includes("Refused to evaluate") || errorMessage.includes("is not defined")) {
            /**
             * Some browsers inject user-behavior tracking script (sendBeacon), or eval expression.
             * Other examples like: _start is not undefined, hasInject is not undefined
             */
            return false;
        } else if (errorMessage.includes("vivoNewsDetailPage")) {
            /**
             * TypeError: vivoNewsDetailPage.getNewsReadStatus4Vivo is not a function
             * Happens in Vivo Android browser, because of its own plugin.
             */
            return false;
        } else if (errorMessage.includes("Loading chunk") || errorMessage.includes("Loading CSS chunk")) {
            /**
             * Network error while downloading JavaScript/CSS (async loading).
             */
            return false;
        } else if (errorMessage.includes("Script error")) {
            /**
             * Some browsers inject cross-domain script, and fail to load.
             * Ref: Note part of https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
             */
            return false;
        }
    }
    return true;
}

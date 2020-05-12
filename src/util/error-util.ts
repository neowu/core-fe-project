import {Exception, JavaScriptException} from "../Exception";
import {ErrorHandler} from "../module";
import {app} from "../app";
import {isIEBrowser} from "./navigator-util";

interface ErrorExtra {
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

export function captureError(error: any, action: string, extra: ErrorExtra = {}): Exception {
    if (process.env.NODE_ENV === "development") {
        console.error(`[framework] Error captured from [${action}]`, error);
    }

    const exception = errorToException(error);
    const errorStacktrace = error instanceof Error ? error.stack : undefined;
    const info = {...extra, stacktrace: errorStacktrace};

    if (shouldErrorBeIgnored(exception.message, errorStacktrace)) {
        app.logger.warn({
            info,
            action: action || "-",
            elapsedTime: 0,
            errorMessage: exception.message,
            errorCode: "IGNORED_ERROR",
        });
    } else {
        app.logger.exception(exception, info, action);
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

export function shouldErrorBeIgnored(errorMessage: string, stacktrace?: string): boolean {
    if (errorMessage.includes("ResizeObserver loop limit exceeded")) {
        /**
         * Current known issue of Ant V4.
         * Happen both in dev and prod environment, safe to ignore.
         *
         * https://github.com/ant-design/ant-design/issues/23246
         * https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
         */
        return true;
    } else if (errorMessage.includes("Script error")) {
        /**
         * Unexpected cross-domain script issues.
         * May still happen for Ant V4 cases, safe to ignore.
         *
         * https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
         */
        return true;
    }

    if (process.env.NODE_ENV === "production") {
        if (isIEBrowser()) {
            return true;
        } else if (errorMessage.includes("Loading chunk") || errorMessage.includes("Loading CSS chunk")) {
            /**
             * Network error while downloading JavaScript/CSS (async loading).
             */
            return true;
        } else if (errorMessage.includes("Refused to evaluate")) {
            /**
             * Some browsers inject its own tracking script snippet / JS file.
             * If it violates CSP, it will trigger such errors.
             */
            return true;
        } else {
            /**
             * Check if the script source is within allowed origins.
             */
            if (app.loggerConfig && app.loggerConfig.allowedJSOrigins && stacktrace) {
                return app.loggerConfig.allowedJSOrigins.every((_) => !stacktrace.includes(_));
            }
        }
    }
    return false;
}

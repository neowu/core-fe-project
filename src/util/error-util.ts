import {Exception, JavaScriptException} from "../Exception";
import {ErrorHandler} from "../module";
import {app} from "../app";
import {isIEBrowser} from "./navigator-util";
import {spawn} from "../typed-saga";
import {GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION, sendEventLogs} from "../platform/bootstrap";

interface ErrorExtra {
    actionPayload?: string; // Should be masked
    extraStacktrace?: string;
}

export function errorToException(error: any): Exception {
    if (error instanceof Exception) {
        return error;
    } else {
        let message: string;
        if (!error) {
            message = "[No Message]";
        } else if (typeof error === "string") {
            message = error;
        } else if (error instanceof Error) {
            message = error.message;
        } else {
            try {
                message = JSON.stringify(error);
            } catch (e) {
                message = "[Unknown]";
            }
        }
        return new JavaScriptException(message);
    }
}

export function captureError(error: any, action: string, extra: ErrorExtra = {}): Exception {
    if (process.env.NODE_ENV === "development") {
        console.error(`[framework] Error captured from [${action}]`, error);
    }

    const exception = errorToException(error);
    const errorStacktrace = error instanceof Error ? error.stack : undefined;
    const info = {...extra, stacktrace: errorStacktrace};

    if (shouldErrorBeIgnored(exception, action, errorStacktrace)) {
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
    if (app.loggerConfig) {
        // For app, report errors to event server ASAP, in case of sudden termination
        yield spawn(sendEventLogs, app.loggerConfig.serverURL);
    }
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

function shouldErrorBeIgnored(exception: Exception, action: string, stacktrace?: string): boolean {
    const errorMessage = exception.message;
    const ignoredPatterns = [
        // Network error while downloading JavaScript/CSS (webpack async loading)
        "Loading chunk",
        "Loading CSS chunk",
        // CORS or CSP issues
        "Content Security Policy",
        "Script error",
        // Vendor injected, mostly still with stacktrace
        "ucbrowser",
        "vivo",
        "Vivo",
    ];

    if (isIEBrowser()) {
        return true;
    } else if (ignoredPatterns.some((_) => errorMessage.includes(_))) {
        return true;
    } else if (exception instanceof JavaScriptException && !isValidStacktrace(stacktrace) && [GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION].includes(action)) {
        return true;
    }

    return false;
}

function isValidStacktrace(stacktrace?: string): boolean {
    if (stacktrace) {
        const validSources: string[] = [];
        document.querySelectorAll("script").forEach((scriptNode) => {
            if (scriptNode.src) {
                validSources.push(scriptNode.src);
            }
        });
        // If validSources is [], it return false
        return validSources.some((_) => stacktrace.includes(_));
    }
    return false;
}

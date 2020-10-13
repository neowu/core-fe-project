import {Exception, JavaScriptException} from "../Exception";
import {ErrorHandler} from "../module";
import {app} from "../app";
import {isIEBrowser} from "./navigator-util";
import {spawn} from "../typed-saga";
import {GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION, sendEventLogs} from "../platform/bootstrap";

let errorHandlerRunning = false;

interface ErrorExtra {
    actionPayload?: string; // Should be masked
    extraStacktrace?: string;
}

export function errorToException(error: unknown): Exception {
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
        return new JavaScriptException(message, error);
    }
}

export function captureError(error: unknown, action: string, extra: ErrorExtra = {}): Exception {
    if (process.env.NODE_ENV === "development") {
        console.error(`[framework] Error captured from [${action}]`, error);
    }

    const exception = errorToException(error);
    const errorStacktrace = error instanceof Error ? error.stack : undefined;
    const info: {[key: string]: string | undefined} = {
        payload: extra.actionPayload,
        extra_stacktrace: extra.extraStacktrace,
        stacktrace: errorStacktrace,
    };

    const errorCode = specialErrorCode(exception, action, errorStacktrace);
    if (errorCode) {
        app.logger.warn({
            action,
            elapsedTime: 0,
            info,
            errorMessage: exception.message,
            errorCode,
        });
    } else {
        app.logger.exception(exception, info, action);
        app.sagaMiddleware.run(runUserErrorHandler, app.errorHandler, exception);
    }

    return exception;
}

export function isErrorHandlingRunning(): boolean {
    return errorHandlerRunning;
}

export function* runUserErrorHandler(handler: ErrorHandler, exception: Exception) {
    // For app, report errors to event server ASAP, in case of sudden termination
    yield spawn(sendEventLogs);
    if (errorHandlerRunning) return;

    try {
        errorHandlerRunning = true;
        yield* handler(exception);
    } catch (e) {
        console.warn("[framework] Fail to execute error handler", e);
    } finally {
        errorHandlerRunning = false;
    }
}

function specialErrorCode(exception: Exception, action: string, stacktrace?: string): string | null {
    const errorMessage = exception.message.toLowerCase();
    const ignoredPatterns = [
        // Network error while downloading JavaScript/CSS (webpack async loading)
        {pattern: "loading chunk", errorCode: "JS_CHUNK"},
        {pattern: "loading css chunk", errorCode: "CSS_CHUNK"},
        // CORS or CSP issues
        {pattern: "content security policy", errorCode: "CSP"},
        {pattern: "script error", errorCode: "CORS"},
        // Vendor injected, mostly still with stacktrace
        {pattern: "ucbrowser", errorCode: "VENDOR"},
        {pattern: "vivo", errorCode: "VENDOR"},
        {pattern: "huawei", errorCode: "VENDOR"},
    ];

    if (isIEBrowser()) {
        return "IE_BROWSER_ISSUE";
    }

    const matchedPattern = ignoredPatterns.find(({pattern}) => errorMessage.includes(pattern));
    if (matchedPattern) {
        return `IGNORED_${matchedPattern.errorCode}_ISSUE`;
    }
    if (exception instanceof JavaScriptException && !isValidStacktrace(stacktrace) && [GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION].includes(action)) {
        return "IGNORED_UNCATEGORIZED_ISSUE";
    }
    if (action === GLOBAL_ERROR_ACTION && stacktrace && errorMessage.includes("'offsetwidth' of null") && stacktrace.includes("Array.forEach")) {
        // This is a known Ant Design Tabs issue
        return "IGNORED_ANTD_TAB_ISSUE";
    }
    return null;
}

function isValidStacktrace(stacktrace?: string): boolean {
    if (stacktrace) {
        const ignoredPatterns = ["chrome-extension://"];
        if (ignoredPatterns.some((_) => stacktrace.includes(_))) {
            return false;
        }

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

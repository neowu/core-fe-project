import {Exception, JavaScriptException} from "../Exception";
import {app} from "../app";
import {isBrowserSupported} from "./navigator-util";
import {spawn} from "../typed-saga";
import {GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION, sendEventLogs} from "../platform/bootstrap";
import type {ErrorHandler} from "../module";

let errorHandlerRunning = false;

interface ErrorExtra {
    actionPayload?: string; // masked
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
        app.logger.exception(exception, {action, info});
        app.sagaMiddleware.run(runUserErrorHandler, app.errorHandler, exception);
    }

    return exception;
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
    if (!isBrowserSupported()) return "UNSUPPORTED_BROWSER";

    const errorMessage = exception.message.toLowerCase();
    const ignoredPatterns = [
        // Network error while downloading JavaScript/CSS/assets
        {pattern: "loading chunk", errorCode: "JS_CHUNK"},
        {pattern: "loading css chunk", errorCode: "CSS_CHUNK"},
        {pattern: "dom source error", errorCode: "DOM_ASSET"},
        // CORS or CSP issues
        {pattern: "content security policy", errorCode: "CSP"},
        {pattern: "script error", errorCode: "CORS"},
        // Vendor related, mostly still with stacktrace
        {pattern: "ucbrowser", errorCode: "VENDOR"},
        {pattern: "vivo", errorCode: "VENDOR"},
        {pattern: "huawei", errorCode: "VENDOR"},
        {pattern: "proxy: trap result did not include", errorCode: "PROXY_UNSUPPORTED"},
        // Browser sandbox issues
        {pattern: "the operation is insecure", errorCode: "BROWSER_LIMIT"},
        {pattern: "access is denied for this document", errorCode: "BROWSER_LIMIT"},
    ];

    const matchedPattern = ignoredPatterns.find(({pattern}) => errorMessage.includes(pattern));
    if (matchedPattern) {
        return `IGNORED_${matchedPattern.errorCode}_ISSUE`;
    }

    if (exception instanceof JavaScriptException && stacktrace?.includes("https://cdn.livechatinc.com/tracking.js") && [GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION].includes(action)) {
        return "IGNORED_LIVE_CHAT_PLUGIN_ISSUE";
    }

    if (exception instanceof JavaScriptException && stacktrace?.includes("https://www.gstatic.cn/recaptcha") && [GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION].includes(action)) {
        return "IGNORED_GOOGLE_RECAPTCHA_ISSUE";
    }

    if (exception instanceof JavaScriptException && !isValidStacktrace(stacktrace) && [GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION].includes(action)) {
        return "IGNORED_EXTERNAL_PLUGIN_ISSUE";
    }

    return null;
}

function isValidStacktrace(stacktrace?: string): boolean {
    if (stacktrace) {
        const ignoredPatterns = ["extension://", "@user-script", "@debugger", "eval code", "ucbrowser_script", "x-plugin-script", "<anonymous>:", "@FormMetadata.js", "image.uc.cn"];
        if (ignoredPatterns.some(_ => stacktrace.includes(_))) {
            return false;
        }
        return stacktrace.includes(".js");
    }
    return false;
}

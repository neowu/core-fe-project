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

    const errorCode = specialWarningErrorCode(exception, action, errorStacktrace);
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

function specialWarningErrorCode(exception: Exception, action: string, stacktrace?: string): string | null {
    if (!isBrowserSupported()) return "UNSUPPORTED_BROWSER";

    const ignorableMessagePatterns = [
        // asset download issues
        "loading chunk",
        "loading css chunk",
        "css_chunk_load_failed",
        "dom source error",
        // CORS or CSP issues
        "content security policy",
        "script error",
        // vendor related (mostly still with stacktrace)
        "ucbrowser",
        "vivo",
        "huawei",
        // Browser sandbox or environment issues
        "proxy: trap result did not include",
        "the operation is insecure",
        "access is denied for this document",
    ];
    if (ignorableMessagePatterns.includes(exception.message.toLowerCase())) return `IGNORED_BROWSER_ENV_ISSUE`;

    // weird errors encountered in reality
    if (exception instanceof JavaScriptException && [GLOBAL_ERROR_ACTION, GLOBAL_PROMISE_REJECTION_ACTION].includes(action)) {
        if (!isValidStacktrace(stacktrace)) return "IGNORED_EXTERNAL_PLUGIN_ISSUE";

        if (stacktrace?.includes("https://cdn.livechatinc.com/tracking.js")) return "IGNORED_LIVE_CHAT_PLUGIN_ISSUE";
        if (stacktrace?.includes("www.gstatic") && stacktrace?.includes("recaptcha")) return "IGNORED_GOOGLE_RECAPTCHA_ISSUE";
        if (exception.message === "Cannot redefine property: message" && stacktrace?.includes("at XMLHttpRequest")) return "IGNORED_GLOBAL_ERROR_OVERWRITE_ISSUE";
    }

    return null;
}

function isValidStacktrace(stacktrace?: string): boolean {
    if (stacktrace) {
        const ignoredPatterns = [
            "extension://",
            "@user-script",
            "@debugger",
            "eval code",
            "ucbrowser_script",
            "plugin-script",
            "<anonymous>:",
            "@FormMetadata.js",
            "hammerhead.js",
            "image.uc.cn",
            "webscraper",
            "playwright-core",
        ];
        if (ignoredPatterns.some(_ => stacktrace.includes(_))) {
            return false;
        }
        return stacktrace.includes(".js");
    }
    return false;
}

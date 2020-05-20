import {loggerContext} from "./platform/logger-context";
import {errorToException} from "./util/error-util";
import {app} from "./app";
import {APIException, Exception, JavaScriptException, NetworkConnectionException} from "./Exception";

interface Log {
    date: Date;
    result: "OK" | "WARN" | "ERROR";
    elapsedTime: number;
    context: {[key: string]: string}; // To store indexed data (for Elastic Search)
    info: {[key: string]: string | undefined}; // To store text data (no index)
    action?: string;
    errorCode?: string;
    errorMessage?: string;
}

interface ErrorLogEntry {
    action: string;
    elapsedTime: number;
    errorCode: string;
    errorMessage: string;
    info: {[key: string]: string | undefined};
}

/**
 * If eventLogger config is provided in non-DEV environment
 * All collected logs will automatically sent to {serverURL} every {sendingFrequency} second
 *
 * The request will be PUT to the server in the following format
 *      {events: Log[]}
 */
export interface LoggerConfig {
    serverURL: string;
    maskedKeywords?: RegExp[];
    allowedJSOrigins?: string[];
}

export interface Logger {
    addContext(context: {[key: string]: string | (() => string)}): void;

    /**
     * Add a log item, whose result is OK
     */
    info(action: string, info: {[key: string]: string}, elapsedTime?: number): void;

    /**
     * Add a log item, whose result is WARN
     * @errorCode: Naming in upper-case and underscore, e.g: SOME_DATA
     */
    warn(data: ErrorLogEntry): void;

    /**
     * Add a log item, whose result is ERROR
     * @errorCode: Naming in upper-case and underscore, e.g: SOME_DATA
     */
    error(data: ErrorLogEntry): void;
}

export class LoggerImpl implements Logger {
    private environmentContext: {[key: string]: string | (() => string)} = {};
    private logQueue: Log[] = [];

    constructor() {
        this.environmentContext = loggerContext;
    }

    addContext(context: {[key: string]: string | (() => string)}): void {
        this.environmentContext = {...this.environmentContext, ...context};
    }

    info(action: string, info: {[key: string]: string | undefined}, elapsedTime?: number): void {
        this.appendLog("OK", {action, info, elapsedTime: elapsedTime || 0});
    }

    warn(data: ErrorLogEntry): void {
        this.appendLog("WARN", data);
    }

    error(data: ErrorLogEntry): void {
        this.appendLog("ERROR", data);
    }

    exception(exception: Exception, extra: {[key: string]: string | undefined}, action: string): void {
        let isWarning: boolean;
        let errorCode: string;
        const info: {[key: string]: string | undefined} = {...extra};

        if (exception instanceof NetworkConnectionException) {
            isWarning = true;
            errorCode = "NETWORK_FAILURE";
            info["requestURL"] = exception.requestURL;
            info["originalErrorMessage"] = exception.originalErrorMessage;
        } else if (exception instanceof APIException) {
            if (exception.statusCode === 400 && exception.errorCode === "VALIDATION_ERROR") {
                isWarning = false;
                errorCode = "API_VALIDATION_ERROR";
            } else {
                isWarning = true;
                errorCode = `API_ERROR_${exception.statusCode}`;
            }
            info["requestURL"] = exception.requestURL;
            info["responseData"] = JSON.stringify(exception.responseData);
            if (exception.errorId) {
                info["apiErrorId"] = exception.errorId;
            }
            if (exception.errorCode) {
                info["apiErrorCode"] = exception.errorCode;
            }
        } else if (exception instanceof JavaScriptException) {
            isWarning = false;
            errorCode = "JAVASCRIPT_ERROR";
            info["appState"] = JSON.stringify(app.store.getState().app);
        } else {
            console.warn("[framework] Exception class should not be extended, throw Error instead");
            isWarning = false;
            errorCode = "JAVASCRIPT_ERROR";
        }

        this.appendLog(isWarning ? "WARN" : "ERROR", {action, errorCode, errorMessage: exception.message, info, elapsedTime: 0});
    }

    collect(): Log[] {
        return this.logQueue;
    }

    empty(): void {
        this.logQueue = [];
    }

    appendLog(result: "OK" | "WARN" | "ERROR", data: Pick<Log, "action" | "info" | "errorCode" | "errorMessage" | "elapsedTime">) {
        const completeContext = {};
        Object.entries(this.environmentContext).map(([key, value]) => {
            if (typeof value === "string") {
                completeContext[key] = value.substr(0, 1000);
            } else {
                try {
                    completeContext[key] = value();
                } catch (e) {
                    const message = errorToException(e).message;
                    completeContext[key] = "[error] " + message;
                    console.warn("[framework] Fail to execute logger context: " + message);
                }
            }
        });

        const event: Log = {
            date: new Date(),
            result,
            context: completeContext,
            ...data,
        };
        this.logQueue.push(event);
    }
}

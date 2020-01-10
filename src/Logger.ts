import {app} from "./app";
import {APIException, Exception, NetworkConnectionException, ReactLifecycleException, RuntimeException} from "./Exception";
import {loggerContext} from "./platform/logger-context";
import {serializeError} from "./util/error-util";

interface Log {
    date: Date;
    result: "OK" | "WARN" | "ERROR";
    elapsedTime: number;
    context: {[key: string]: string}; // To store indexed data (for Elastic Search)
    info: {[key: string]: string}; // To store text data (no index)
    action?: string;
    errorCode?: string;
    errorMessage?: string;
}

interface ErrorLogEntry {
    elapsedTime: number;
    action: string;
    errorCode: string;
    errorMessage: string;
    info: {[key: string]: string};
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
    sendingFrequency: number;
    maskedKeywords?: RegExp[];
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

    info(action: string, info: {[key: string]: string}, elapsedTime?: number): void {
        return this.appendLog("OK", {action, info, elapsedTime: elapsedTime || 0});
    }

    warn(data: ErrorLogEntry): void {
        return this.appendLog("WARN", data);
    }

    error(data: ErrorLogEntry): void {
        return this.appendLog("ERROR", data);
    }

    exception(exception: Exception, action?: string, extraInfo?: {[key: string]: string}): void {
        if (exception instanceof NetworkConnectionException) {
            const info: {[key: string]: string} = {
                ...extraInfo,
                url: exception.requestURL,
                originalErrorMessage: exception.originalErrorMessage,
            };
            return this.appendLog("WARN", {action, errorCode: "NETWORK_FAILURE", errorMessage: exception.message, info, elapsedTime: 0});
        } else {
            const info: {[key: string]: string} = {...extraInfo};
            let isWarning: boolean = false;
            let errorCode: string = "OTHER_ERROR";

            if (exception instanceof APIException) {
                errorCode = `API_ERROR_${exception.statusCode}`;
                // Following cases are treated as expected
                if ([401, 403, 421, 426, 503].includes(exception.statusCode)) {
                    isWarning = true;
                } else if (exception.statusCode === 400) {
                    if (exception.errorCode === "VALIDATION_ERROR") {
                        errorCode = "API_VALIDATION_ERROR";
                    } else {
                        isWarning = true;
                    }
                }

                info.requestURL = exception.requestURL;
                if (exception.errorCode) {
                    info.errorCode = exception.errorCode;
                }
                if (exception.errorId) {
                    info.errorId = exception.errorId;
                }
            } else if (exception instanceof ReactLifecycleException) {
                errorCode = "LIFECYCLE_ERROR";
                info.stackTrace = exception.componentStack;
                info.appState = JSON.stringify(app.store.getState().app);
            } else if (exception instanceof RuntimeException) {
                errorCode = "RUNTIME_ERROR";
                info.errorObject = serializeError(exception.errorObject);
            }

            return this.appendLog(isWarning ? "WARN" : "ERROR", {action, errorCode, errorMessage: exception.message, info, elapsedTime: 0});
        }
    }

    collect(): Log[] {
        return this.logQueue;
    }

    empty(): void {
        this.logQueue = [];
    }

    private appendLog(result: "OK" | "WARN" | "ERROR", data: Pick<Log, "action" | "info" | "errorCode" | "errorMessage" | "elapsedTime">) {
        const completeContext = {};
        Object.entries(this.environmentContext).map(([key, value]) => {
            if (typeof value === "string") {
                completeContext[key] = value;
            } else {
                let evaluatedResult: string;
                try {
                    evaluatedResult = value();
                } catch (e) {
                    evaluatedResult = "[ERROR] " + serializeError(e);
                    console.warn("Fail to execute logger context: " + serializeError(e));
                }
                completeContext[key] = evaluatedResult;
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

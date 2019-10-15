import {app} from "./app";
import {APIException, Exception, NetworkConnectionException, ReactLifecycleException, RuntimeException} from "./Exception";
import {loggerContext} from "./platform/loggerContext";

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
    info(action: string, info?: {[key: string]: string}): () => void;

    /**
     * Add a log item, whose result is WARN
     * @errorCode: Naming in upper-case and underscore, e.g: SOME_DATA
     */
    warn(data: ErrorLogEntry): () => void;

    /**
     * Add a log item, whose result is ERROR
     * @errorCode: Naming in upper-case and underscore, e.g: SOME_DATA
     */
    error(data: ErrorLogEntry): () => void;
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

    info(action: string, info?: {[key: string]: string}): () => void {
        return this.appendLog("OK", {action, info: info || {}});
    }

    warn(data: ErrorLogEntry): () => void {
        return this.appendLog("WARN", data);
    }

    error(data: ErrorLogEntry): () => void {
        return this.appendLog("ERROR", data);
    }

    exception(exception: Exception, action?: string): () => void {
        if (exception instanceof NetworkConnectionException) {
            const info: {[key: string]: string} = {
                url: exception.requestURL,
                errorObject: JSON.stringify(exception.errorObject),
            };
            return this.appendLog("WARN", {action, errorCode: "NETWORK_FAILURE", errorMessage: exception.message, info});
        } else {
            const info: {[key: string]: string} = {};
            let isWarning: boolean = false;
            let errorCode: string = "OTHER_ERROR";

            if (exception instanceof APIException) {
                errorCode = `API_ERROR_${exception.statusCode}`;
                // Following cases are treated as expected
                if ([401, 403, 426, 503].includes(exception.statusCode)) {
                    isWarning = true;
                } else if (exception.statusCode === 400) {
                    if (exception.errorCode === "VALIDATION_ERROR") {
                        errorCode = "API_VALIDATION_FAIL";
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
                errorCode = "JS_ERROR";
                info.errorObject = JSON.stringify(exception.errorObject);
                info.appState = JSON.stringify(app.store.getState().app);
            }

            return this.appendLog(isWarning ? "WARN" : "ERROR", {action, errorCode, errorMessage: exception.message, info});
        }
    }

    collect(): Log[] {
        return this.logQueue;
    }

    empty(): void {
        this.logQueue = [];
    }

    private appendLog(result: "OK" | "WARN" | "ERROR", data: Pick<Log, "action" | "info" | "errorCode" | "errorMessage">): () => void {
        const completeContext = {};
        Object.entries(this.environmentContext).map(([key, value]) => {
            completeContext[key] = typeof value === "string" ? value : value();
        });

        const event: Log = {
            date: new Date(),
            result,
            context: completeContext,
            elapsedTime: 0,
            ...data,
        };

        this.logQueue.push(event);
        return () => {
            event.elapsedTime = new Date().getTime() - event.date.getTime();
        };
    }
}

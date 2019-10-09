import {app} from "./app";
import {APIException, Exception, NetworkConnectionException, ReactLifecycleException, RuntimeException} from "./Exception";
import {loggerContext} from "./platform/loggerContext";

interface Log {
    date: Date;
    result: "OK" | "WARN" | "ERROR";
    context: {[key: string]: string}; // To store indexed data (for Elastic Search)
    info: {[key: string]: string}; // To store text data (no index)
    elapsedTime: number;
    action?: string;
    errorCode?: string;
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
    warn(errorCode: string, action?: string, info?: {[key: string]: string}): () => void;

    /**
     * Add a log item, whose result is ERROR
     * @errorCode: Naming in upper-case and underscore, e.g: SOME_DATA
     */
    error(errorCode: string, action?: string, info?: {[key: string]: string}): () => void;

    /**
     * Output all the logs in the console, from current queue
     */
    debug(): void;
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
        return this.appendLog("OK", action, undefined, info);
    }

    warn(errorCode: string, action?: string, info?: {[key: string]: string}): () => void {
        return this.appendLog("WARN", action, errorCode, info);
    }

    error(errorCode: string, action?: string, info?: {[key: string]: string}): () => void {
        return this.appendLog("ERROR", action, errorCode, info);
    }

    debug(): void {
        console.info("#### [" + new Date().toLocaleString() + "] Logs, Total " + this.logQueue.length);
        this.logQueue.forEach((_, index) => {
            let colorString: string;
            if (_.result === "OK") {
                colorString = "background:green; color:#fff";
            } else {
                colorString = "background:red; color:#fff";
            }
            console.info(`%c (${index + 1}) ${_.result} `, colorString, _.date.toLocaleString());
            if (_.errorCode) {
                console.info(`%c CODE `, "background:red; color:#fff", _.errorCode);
            }
            if (_.action) {
                console.info(`%c ACTION `, "background:#ddd; color:#111", _.action);
            }
            if (Object.keys(_.info).length > 0) {
                console.info(`%c INFO `, "background:#ddd; color:#111", _.info);
            }
        });
    }

    exception(exception: Exception, action?: string): () => void {
        if (exception instanceof NetworkConnectionException) {
            return this.appendLog("WARN", action, "NETWORK_FAILURE", {errorMessage: exception.message, url: exception.requestURL});
        } else {
            const info: {[key: string]: string} = {errorMessage: exception.message};
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
                info.stackTrace = JSON.stringify(exception.errorObject);
                info.appState = JSON.stringify(app.store.getState().app);
            }

            return this.appendLog(isWarning ? "WARN" : "ERROR", action, errorCode, info);
        }
    }

    collect(): Log[] {
        return this.logQueue;
    }

    empty(): void {
        this.logQueue = [];
    }

    private appendLog(result: "OK" | "WARN" | "ERROR", action?: string, errorCode?: string, info?: {[key: string]: string}): () => void {
        const completeContext = {};
        Object.entries(this.environmentContext).map(([key, value]) => {
            completeContext[key] = typeof value === "string" ? value : value();
        });

        const event: Log = {
            date: new Date(),
            result,
            action,
            errorCode,
            info: info || {},
            context: completeContext,
            elapsedTime: 0,
        };

        this.logQueue.push(event);
        return () => {
            event.elapsedTime = new Date().getTime() - event.date.getTime();
        };
    }
}

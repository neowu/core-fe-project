import {APIException, Exception, JavaScriptException, NetworkConnectionException} from "./Exception";
import {loggerContext} from "./platform/logger-context";
import {serializeOriginalError} from "./util/error-util";

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
        let isWarning: boolean;
        let errorCode: string;
        let exceptionInfo: {[key: string]: string};

        if (exception instanceof NetworkConnectionException) {
            isWarning = true;
            errorCode = "NETWORK_FAILURE";
            exceptionInfo = {
                url: exception.requestURL,
                originalErrorMessage: exception.originalErrorMessage,
            };
        } else if (exception instanceof APIException) {
            if (exception.statusCode === 400 && exception.errorCode === "VALIDATION_ERROR") {
                isWarning = false;
                errorCode = "API_VALIDATION_ERROR";
            } else {
                isWarning = true;
                errorCode = `API_ERROR_${exception.statusCode}`;
            }
            exceptionInfo = {
                requestURL: exception.requestURL,
                responseData: JSON.stringify(exception.responseData),
                apiErrorId: exception.errorId || "-",
                apiErrorCode: exception.errorCode || "-",
            };
        } else {
            isWarning = false;
            errorCode = "JAVASCRIPT_ERROR";
            exceptionInfo = exception instanceof JavaScriptException ? {errorName: exception.name} : {};
        }

        const info = {...extraInfo, ...exceptionInfo};
        return this.appendLog(isWarning ? "WARN" : "ERROR", {action, errorCode, errorMessage: exception.message, info, elapsedTime: 0});
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
                completeContext[key] = value.substr(0, 1000);
            } else {
                let evaluatedResult: string;
                try {
                    evaluatedResult = value();
                } catch (e) {
                    const {name, message} = serializeOriginalError(e);
                    evaluatedResult = `[${name}]: ${message}`;
                    console.warn("Fail to execute logger context: " + message);
                }
                completeContext[key] = evaluatedResult.substr(0, 1000);
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

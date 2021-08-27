import {loggerContext} from "./platform/logger-context";
import {errorToException} from "./util/error-util";
import {app} from "./app";
import {APIException, Exception, JavaScriptException, NetworkConnectionException} from "./Exception";

interface Log {
    date: Date;
    action: string;
    result: "OK" | "WARN" | "ERROR";
    elapsedTime: number;
    context: {[key: string]: string}; // Indexed data for Elastic Search, key in lowercase with underscore, e.g: some_field
    info: {[key: string]: string}; // Text data for view only, key in lowercase with underscore, e.g: some_field
    stats: {[key: string]: number}; // Numerical data for Elastic Search and statistics, key in lowercase with underscore, e.g: some_field
    errorCode?: string | undefined; // Naming in uppercase with underscore, e.g: SOME_ERROR
    errorMessage?: string | undefined;
}

interface InfoLogEntry {
    action: string;
    elapsedTime?: number;
    info?: {[key: string]: string | undefined};
    stats?: {[key: string]: number | undefined};
}

interface ErrorLogEntry extends InfoLogEntry {
    errorCode: string;
    errorMessage: string;
}

/**
 * If eventLogger config is provided in non-DEV environment.
 * All collected logs will automatically sent to {serverURL} in a regular basis.
 *
 * The request will be PUT to the server in the following format:
 *      {events: Log[]}
 */
export interface LoggerConfig {
    serverURL: string;
    slowStartupThreshold?: number; // In second, default: 5
    maskedKeywords?: RegExp[];
}

export interface Logger {
    addContext(context: {[key: string]: string | (() => string)}): void;
    removeContext(key: string): void;
    info(entry: InfoLogEntry): void;
    warn(data: ErrorLogEntry): void;
    error(data: ErrorLogEntry): void;
}

export class LoggerImpl implements Logger {
    private contextMap: {[key: string]: string | (() => string)} = {};
    private logQueue: Log[] = [];
    private collectPosition = 0;

    constructor() {
        this.contextMap = loggerContext;
    }

    addContext(context: {[key: string]: string | (() => string)}): void {
        const newContextMap = {...this.contextMap, ...context};
        const contextSize = Object.keys(newContextMap).length;
        if (contextSize > 20) {
            console.warn(`[framework] Logger context size ${contextSize} is too large`);
        }
        this.contextMap = newContextMap;
    }

    removeContext(key: string): void {
        if (this.contextMap[key] !== undefined) {
            delete this.contextMap[key];
        } else {
            console.warn(`[framework] Logger context key ${key} does not exist`);
        }
    }

    info(entry: InfoLogEntry): void {
        this.createLog("OK", entry);
    }

    warn(entry: ErrorLogEntry): void {
        this.createLog("WARN", entry);
    }

    error(entry: ErrorLogEntry): void {
        this.createLog("ERROR", entry);
    }

    exception(exception: Exception, extraInfo: {[key: string]: string | undefined}, action: string): void {
        let isWarning: boolean;
        let errorCode: string;
        const info: {[key: string]: string | undefined} = {...extraInfo};

        if (exception instanceof NetworkConnectionException) {
            isWarning = true;
            errorCode = "NETWORK_FAILURE";
            info["api_url"] = exception.requestURL;
            info["original_message"] = exception.originalErrorMessage;
        } else if (exception instanceof APIException) {
            if (exception.statusCode === 400 && exception.errorCode === "VALIDATION_ERROR") {
                isWarning = false;
                errorCode = "API_VALIDATION_ERROR";
            } else {
                isWarning = true;
                errorCode = `API_ERROR_${exception.statusCode}`;
            }
            info["api_url"] = exception.requestURL;
            info["api_response"] = JSON.stringify(exception.responseData);
            if (exception.errorId) {
                info["api_error_id"] = exception.errorId;
            }
            if (exception.errorCode) {
                info["api_error_code"] = exception.errorCode;
            }
        } else if (exception instanceof JavaScriptException) {
            isWarning = false;
            errorCode = "JAVASCRIPT_ERROR";
            info["app_state"] = JSON.stringify(app.store.getState().app);
        } else {
            console.warn("[framework] Exception class should not be extended, throw Error instead");
            isWarning = false;
            errorCode = "JAVASCRIPT_ERROR";
        }

        this.createLog(isWarning ? "WARN" : "ERROR", {action, errorCode, errorMessage: exception.message, info, elapsedTime: 0});
    }

    collect(maxSize: number = 0): ReadonlyArray<Log> {
        const totalLength = this.logQueue.length;
        if (maxSize > 0 && maxSize < totalLength) {
            this.collectPosition = maxSize;
            return this.logQueue.slice(0, maxSize);
        } else {
            this.collectPosition = totalLength;
            return this.logQueue;
        }
    }

    emptyLastCollection(): void {
        this.logQueue = this.logQueue.slice(this.collectPosition);
    }

    private createLog(result: "OK" | "WARN" | "ERROR", entry: InfoLogEntry | ErrorLogEntry): void {
        // Generate context
        const context: {[key: string]: string} = {};
        Object.entries(this.contextMap).map(([key, value]) => {
            if (typeof value === "string") {
                context[key] = value.substr(0, 1000);
            } else {
                try {
                    context[key] = value();
                } catch (e) {
                    const message = errorToException(e).message;
                    context[key] = "ERR# " + message;
                    console.warn("[framework] Fail to execute logger context: " + message);
                }
            }
        });

        // Generate info
        const info: {[key: string]: string} = {};
        if (entry.info) {
            Object.entries(entry.info).map(([key, value]) => {
                if (value !== undefined) {
                    const isBuiltinInfo = ["app_state", "stacktrace", "extra_stacktrace"].includes(key);
                    info[key] = isBuiltinInfo ? value.substr(0, 500000) : value.substr(0, 500);
                }
            });
        }

        // Generate stats
        const stats: {[key: string]: number} = {};
        if (entry.stats) {
            Object.entries(entry.stats).map(([key, value]) => {
                if (value !== undefined) {
                    stats[key] = value;
                }
            });
        }

        const event: Log = {
            date: new Date(),
            action: entry.action,
            elapsedTime: entry.elapsedTime || 0,
            result,
            context,
            info,
            stats,
            errorCode: "errorCode" in entry ? entry.errorCode : undefined,
            errorMessage: "errorMessage" in entry ? entry.errorMessage.substr(0, 1000) : undefined,
        };
        this.logQueue.push(event);
    }
}

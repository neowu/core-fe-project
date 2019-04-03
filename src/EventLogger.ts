import {app} from "./app";
import {APIException, Exception, NetworkConnectionException, ReactLifecycleException, RuntimeException} from "./Exception";

export interface EventLog {
    id: string;
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
 *      {events: LogEvent[]}
 */
export interface EventLoggerConfig {
    serverURL: string;
    sendingFrequency: number;
    maskedKeywords?: RegExp[];
}

export class EventLogger {
    private environmentContext: {[key: string]: string | (() => string)} = {};
    private idCounter = new Date().getTime();
    private logQueue: EventLog[] = [];

    setContext(context: {[key: string]: string | (() => string)}): void {
        this.environmentContext = context;
    }

    /**
     * Logger can log simple event (string type + parameter), or an exception
     * Declare function overload signatures in advance
     * Ref: http://www.typescriptlang.org/docs/handbook/functions.html#overloads
     */
    log(action: string, info?: {[key: string]: string}): () => void;
    log(exception: Exception): () => void;

    log(_: string | Exception, info: {[key: string]: string} = {}): () => void {
        if (typeof _ === "string") {
            return this.appendLog(_, "OK", info);
        } else if (_ instanceof NetworkConnectionException) {
            return this.appendLog("NETWORK_FAILURE", "WARN", {errorMessage: _.message});
        } else {
            const info: {[key: string]: string} = {errorMessage: _.message};
            let errorCode: string = "ERROR";

            if (_ instanceof APIException) {
                errorCode = `API_ERROR:${_.statusCode}`;
                info.requestURL = _.requestURL;
                info.statusCode = _.statusCode.toString();
            } else if (_ instanceof ReactLifecycleException) {
                errorCode = "LIFECYCLE_ERROR";
                info.stackTrace = _.componentStack;
                info.appState = JSON.stringify(app.store.getState().app);
            } else if (_ instanceof RuntimeException) {
                errorCode = "JS_ERROR";
                info.stackTrace = JSON.stringify(_.errorObject);
                info.appState = JSON.stringify(app.store.getState().app);
            }

            return this.appendLog(errorCode, "ERROR", info);
        }
    }

    // TODO: WARN/ERROR can have action as well
    private appendLog(actionOrErrorCode: string, result: "OK" | "WARN" | "ERROR", info: {[key: string]: string}): () => void {
        const completeContext = {};
        Object.entries(this.environmentContext).map(([key, value]) => {
            completeContext[key] = typeof value === "string" ? value : value();
        });

        const event: EventLog = {
            id: this.nextId(),
            date: new Date(),
            result,
            info,
            context: completeContext,
            elapsedTime: 0,
        };

        if (result === "OK") {
            event.action = actionOrErrorCode;
        } else {
            event.errorCode = actionOrErrorCode;
        }

        this.logQueue.push(event);
        return () => {
            event.elapsedTime = new Date().getTime() - event.date.getTime();
        };
    }

    private nextId(): string {
        return (this.idCounter++).toString(16);
    }
}

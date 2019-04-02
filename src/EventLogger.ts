import {app} from "./app";
import {APIException, Exception, NetworkConnectionException, ReactLifecycleException, RuntimeException} from "./Exception";

export interface LogEvent {
    id: string;
    date: Date;
    result: "OK" | "WARN" | "ERROR";
    context: {[key: string]: string}; // To store indexed data (for Elastic Search)
    info: {[key: string]: string}; // To store text data (no index)
    elapsedTime: number;
    action?: string;
    errorCode?: string;
}

export class EventLogger {
    private environmentContext: {[key: string]: string | (() => string)} = {};
    private uuidCounter = new Date().getTime();
    private logQueue: LogEvent[] = [];

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
            return this.appendLog("networkFailure", "WARN", {errorMessage: _.message});
        } else {
            const exceptionInfo: {[key: string]: string} = {errorMessage: _.message};
            let errorCode: string = "error";

            if (_ instanceof APIException) {
                errorCode = `apiError:${_.statusCode}`;
                exceptionInfo.requestURL = _.requestURL;
                exceptionInfo.statusCode = _.statusCode.toString();
            } else if (_ instanceof ReactLifecycleException) {
                errorCode = "lifecycleError";
                exceptionInfo.stackTrace = _.componentStack;
                exceptionInfo.appState = JSON.stringify(app.store.getState().app);
            } else if (_ instanceof RuntimeException) {
                errorCode = "jsError";
                exceptionInfo.stackTrace = JSON.stringify(_.errorObject);
                exceptionInfo.appState = JSON.stringify(app.store.getState().app);
            }

            return this.appendLog(errorCode, "ERROR", exceptionInfo);
        }
    }

    collect(): Array<Readonly<LogEvent>> {
        return this.logQueue;
    }

    empty(): void {
        this.logQueue = [];
    }

    private appendLog(actionOrErrorCode: string, result: "OK" | "WARN" | "ERROR", info: {[key: string]: string}): () => void {
        const completeContext = {};
        Object.entries(this.environmentContext).map(([key, value]) => {
            completeContext[key] = typeof value === "string" ? value : value();
        });

        const event: LogEvent = {
            id: this.getUUID(),
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

    private getUUID(): string {
        return (this.uuidCounter++).toString(16);
    }
}

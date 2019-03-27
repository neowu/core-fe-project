import {app} from "./app";
import {
    APIException,
    Exception,
    NetworkConnectionException,
    ReactLifecycleException,
    RuntimeException
} from "./Exception";

export interface LogEvent {
    id: string;
    date: Date;
    type: string;
    result: "OK" | "WARN" | "ERROR";
    context: {[key: string]: string};
    elapsedTime: number;
    errorMessage?: string;
    exceptionStackTrace?: string;
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
    log(type: string, extraContext?: {[key: string]: string}): () => void;
    log(exception: Exception): () => void;

    log(type: string | Exception, extraContext: {[key: string]: string} = {}): () => void {
        if (typeof type === "string") {
            return this.appendLog(type, "OK", extraContext);
        } else if (type instanceof NetworkConnectionException) {
            return this.appendLog("networkFailure", "WARN", {}, type.message);
        } else {
            const exception = type;
            const exceptionContext: {[key: string]: string} = {};
            let errorType: string = "error";
            let stackTrace: string | undefined;

            if (exception instanceof APIException) {
                errorType = `apiError(${exception.statusCode})`;
                exceptionContext.requestURL = exception.requestURL;
                exceptionContext.statusCode = exception.statusCode.toString();
            } else if (exception instanceof ReactLifecycleException) {
                errorType = "lifecycleError";
                stackTrace = exception.componentStack;
                exceptionContext.appState = JSON.stringify(app.store.getState().app);
            } else if (exception instanceof RuntimeException) {
                errorType = "jsError";
                stackTrace = JSON.stringify(exception.errorObject);
                exceptionContext.appState = JSON.stringify(app.store.getState().app);
            }

            return this.appendLog(errorType, "ERROR", exceptionContext, exception.message, stackTrace);
        }
    }

    collect(): Array<Readonly<LogEvent>> {
        return this.logQueue;
    }

    empty(): void {
        this.logQueue = [];
    }

    private appendLog(type: string, result: "OK" | "WARN" | "ERROR", extraContext: {[key: string]: string}, errorMessage?: string, exceptionStackTrace?: string): () => void {
        const completeContext = {...extraContext};
        Object.entries(this.environmentContext).map(([key, value]) => {
            completeContext[key] = typeof value === "string" ? value : value();
        });

        const event: LogEvent = {
            id: this.getUUID(),
            date: new Date(),
            result,
            type,
            context: completeContext,
            elapsedTime: 0,
            errorMessage,
            exceptionStackTrace,
        };
        this.logQueue.push(event);
        return () => {
            event.elapsedTime = new Date().getTime() - event.date.getTime();
        };
    }

    private getUUID(): string {
        return (this.uuidCounter++).toString(16);
    }
}

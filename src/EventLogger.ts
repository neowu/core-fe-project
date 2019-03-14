import {APIException, Exception, ReactLifecycleException} from "./Exception";

export interface LogEvent {
    id: string;
    date: Date;
    type: string;
    context: {[key: string]: string};
    errorMessage?: string;
    elapsedTime?: number;
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
            return this.appendLog(type, extraContext);
        } else {
            const exception = type;
            const exceptionContext: {[key: string]: string} = {};
            if (exception instanceof APIException) {
                exceptionContext.requestURL = exception.requestURL;
                exceptionContext.statusCode = exception.statusCode.toString();
            } else if (exception instanceof ReactLifecycleException) {
                exceptionContext.stackTrace = exception.componentStack;
            }
            return this.appendLog("error", exceptionContext, exception.message);
        }
    }

    /**
     * Calling collect() will empty current logs, return a copied list
     */
    collect(): Array<Readonly<LogEvent>> {
        const copiedLogs = this.logQueue.slice();
        this.logQueue = [];
        return copiedLogs;
    }

    private appendLog(type: string, extraContext: {[key: string]: string}, errorMessage?: string): () => void {
        const completeContext = {...extraContext};
        Object.entries(this.environmentContext).map(([key, value]) => {
            completeContext[key] = typeof value === "string" ? value : value();
        });

        const event: LogEvent = {
            id: this.getUUID(),
            date: new Date(),
            type,
            context: completeContext,
            errorMessage,
        };
        this.logQueue.push(event);
        return () => {
            if (event.elapsedTime) {
                throw new Error("This log event has frozen, and cannot record elapsed time again");
            }
            event.elapsedTime = new Date().getTime() - event.date.getTime();
        };
    }

    private getUUID(): string {
        return (this.uuidCounter++).toString(16);
    }
}

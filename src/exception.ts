import {Action} from "./action";

export abstract class Exception {
    protected constructor(public message: string) {}
}

export const ERROR_ACTION_TYPE: string = "@@framework/error";

export function errorAction(error: any): Action<Exception> {
    const exception: Exception = error instanceof Exception ? error : new RuntimeException(error && error.message ? error.message : "unknown error", error);
    if (process.env.NODE_ENV === "development") {
        // Avoid output in jest (process.env.NODE_ENV === "test")
        console.error(exception);
    }
    return {
        type: ERROR_ACTION_TYPE,
        payload: exception,
    };
}

export class NotFoundException extends Exception {
    constructor() {
        super(`not found, url=${location.href}`);
    }
}

export class RuntimeException extends Exception {
    constructor(message: string, public error: Error) {
        super(message);
    }
}

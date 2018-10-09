import {Exception, RuntimeException} from "../exception";
import {Action} from "../type";

export const ERROR_ACTION_TYPE: string = "@@framework/error";

export function errorAction(error: any): Action<Exception> {
    // Call console.error before dispatching this action, in order to output the original error object
    const exception: Exception = error instanceof Exception ? error : new RuntimeException(error && error.message ? error.message : "unknown error", error);
    return {
        type: ERROR_ACTION_TYPE,
        payload: exception,
    };
}

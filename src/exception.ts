import {Action} from "./action";

export interface Exception {
    message: string;
}

export const ERROR_ACTION_TYPE: string = "@@framework/error";

export function errorAction(error: Exception): Action<Exception> {
    return {
        type: ERROR_ACTION_TYPE,
        payload: error,
    };
}

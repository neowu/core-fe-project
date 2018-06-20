import {Action} from "./action";

export interface LoadingState {
    [loading: string]: number; // use number to track loading status, because for global action type, there may be multiple effects listen to it, hide loading component when status reduce to 0
}

interface LoadingActionPayload {
    loading: string;
    show: boolean;
}

export const LOADING_ACTION_TYPE = "@@framework/loading";

export function loadingAction(loading: string, show: boolean): Action<LoadingActionPayload> {
    return {
        type: LOADING_ACTION_TYPE,
        payload: {loading, show},
    };
}

export function loadingReducer(state: LoadingState = {}, action: Action<LoadingActionPayload>): LoadingState {
    const payload = action.payload;
    const count = state[payload.loading] || 0;
    return {
        ...state,
        [payload.loading]: count + (payload.show ? 1 : -1),
    };
}

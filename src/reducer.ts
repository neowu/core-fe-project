import {connectRouter, RouterState} from "connected-react-router";
import {History} from "history";
import {Action as ReduxAction, combineReducers, Reducer} from "redux";
import {Exception, RuntimeException} from "./Exception";

// Redux State
interface LoadingState {
    [loading: string]: number;
}

export interface State {
    loading: LoadingState;
    app: {};
    router: RouterState;
}

// Redux Action
export interface Action<P> extends ReduxAction<string> {
    name?: string;
    payload: P;
}

// Redux Action: SetState (to update state.app)
const SET_STATE_ACTION = "@@framework/setState";

interface SetStateActionPayload {
    module: string;
    state: any;
}

export function setStateAction(module: string, state: object, type: string): Action<SetStateActionPayload> {
    return {
        type,
        name: SET_STATE_ACTION,
        payload: {module, state},
    };
}

function setStateReducer(state: State["app"] = {}, action: Action<any>): State["app"] {
    // Use action.name for set state action, make type specifiable to make tracking/tooling easier
    if (action.name === SET_STATE_ACTION) {
        const {module, state: moduleState} = action.payload as SetStateActionPayload;
        return {...state, [module]: {...state[module], ...moduleState}};
    }
    return state;
}

// Redux Action: Loading (to update state.loading)
interface LoadingActionPayload {
    identifier: string;
    show: boolean;
}

export const LOADING_ACTION = "@@framework/loading";

export function loadingAction(identifier: string, show: boolean): Action<LoadingActionPayload> {
    return {
        type: LOADING_ACTION,
        payload: {identifier, show},
    };
}

function loadingReducer(state: LoadingState = {}, action: Action<LoadingActionPayload>): LoadingState {
    if (action.type === LOADING_ACTION) {
        const payload = action.payload as LoadingActionPayload;
        const count = state[payload.identifier] || 0;
        return {
            ...state,
            [payload.identifier]: count + (payload.show ? 1 : -1),
        };
    }
    return state;
}

// Redux Action: Error (handled by saga)
export const ERROR_ACTION_TYPE: string = "@@framework/error";

export function errorAction(error: any): Action<Exception> {
    if (process.env.NODE_ENV === "development") {
        console.warn("Error Caught:", error);
    }

    const exception: Exception = error instanceof Exception ? error : new RuntimeException(error && error.message ? error.message : "unknown error", error);
    return {
        type: ERROR_ACTION_TYPE,
        payload: exception,
    };
}

// Root Reducer
export function rootReducer(history: History): Reducer<State> {
    return combineReducers<State>({
        router: connectRouter(history),
        loading: loadingReducer,
        app: setStateReducer,
    });
}

// Helper function, to determine if show loading
export function showLoading(state: State, identifier: string = "global") {
    return state.loading[identifier] > 0;
}

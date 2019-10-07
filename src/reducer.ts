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
    router: RouterState;
    navigationPrevented: boolean;
    app: {};
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

export function loadingAction(show: boolean, identifier: string = "global"): Action<LoadingActionPayload> {
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

// Redux Action: Navigation Prevent (to update state.navigationPrevented)
interface NavigationPreventionActionPayload {
    isPrevented: boolean;
}

const NAVIGATION_PREVENTION_ACTION = "@@framework/navigation-prevention";

export function navigationPreventionAction(isPrevented: boolean): Action<NavigationPreventionActionPayload> {
    return {
        type: NAVIGATION_PREVENTION_ACTION,
        payload: {isPrevented},
    };
}

function navigationPreventionReducer(state: boolean = false, action: Action<NavigationPreventionActionPayload>): boolean {
    if (action.type === NAVIGATION_PREVENTION_ACTION) {
        const payload = action.payload as NavigationPreventionActionPayload;
        return payload.isPrevented;
    }
    return state;
}

// Redux Action: Error (handled by saga)
export interface ExceptionPayload {
    exception: Exception;
    actionName?: string;
}

export const ERROR_ACTION_TYPE: string = "@@framework/error";

export function errorAction(error: any, actionName?: string): Action<ExceptionPayload> {
    if (process.env.NODE_ENV === "development") {
        console.warn("Error Caught:", error);
    }

    const exception: Exception = error instanceof Exception ? error : new RuntimeException(error && error.message ? error.message : "unknown error", error);
    return {
        type: ERROR_ACTION_TYPE,
        payload: {exception, actionName},
    };
}

// Root Reducer
export function rootReducer(history: History): Reducer<State> {
    return combineReducers<State>({
        router: connectRouter(history),
        loading: loadingReducer,
        app: setStateReducer,
        navigationPrevented: navigationPreventionReducer,
    });
}

// Helper function, to determine if show loading
export function showLoading(state: State, identifier: string = "global") {
    return state.loading[identifier] > 0;
}

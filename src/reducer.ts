import {connectRouter, RouterState} from "connected-react-router";
import {Action as ReduxAction, combineReducers, Reducer} from "redux";
import {DEFAULT_IDLE_TIMEOUT} from "./util/IdleDetector";
import type {History} from "history";

// Redux State
interface LoadingState {
    [loading: string]: number;
}

export interface IdleState {
    timeout: number;
    state: "active" | "idle";
}

export interface State {
    loading: LoadingState;
    router: RouterState;
    navigationPrevented: boolean;
    app: object;
    idle: IdleState;
}

// Redux Action
const SET_STATE_ACTION = "@@framework/setState";

export interface Action<P> extends ReduxAction<string> {
    payload: P;
    name?: typeof SET_STATE_ACTION;
}

// Redux Action: SetState (to update state.app)
interface SetStateActionPayload {
    module: string;
    state: any;
}

// state must be complete module state, not partial
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
        return {...state, [module]: moduleState};
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

// Redux Action: Idle state  (to update state.idle)
interface IdleStateActionPayload {
    state: "active" | "idle";
}

export const IDLE_STATE_ACTION = "@@framework/idle-state";

export function idleStateActions(state: "active" | "idle"): Action<IdleStateActionPayload> {
    return {
        type: IDLE_STATE_ACTION,
        payload: {state},
    };
}

// Redux Action: Idle timeout (to update state.timeout)
interface IdleTimeoutActionPayload {
    timeout: IdleState["timeout"];
}

const IDLE_TIMEOUT_ACTION = "@@framework/idle-timeout";

export function idleTimeoutActions(timeout: number): Action<IdleTimeoutActionPayload> {
    return {
        type: IDLE_TIMEOUT_ACTION,
        payload: {timeout},
    };
}

export function idleReducer(state: IdleState = {timeout: DEFAULT_IDLE_TIMEOUT, state: "active"}, action: Action<IdleStateActionPayload | IdleTimeoutActionPayload>): IdleState {
    if (action.type === IDLE_STATE_ACTION) {
        const payload = action.payload as IdleStateActionPayload;
        return {...state, state: payload.state};
    } else if (action.type === IDLE_TIMEOUT_ACTION) {
        const payload = action.payload as IdleTimeoutActionPayload;
        return {...state, timeout: payload.timeout};
    } else {
        return state;
    }
}

// Root Reducer
export function rootReducer(history: History): Reducer<State> {
    return combineReducers<State>({
        router: connectRouter(history),
        loading: loadingReducer,
        app: setStateReducer,
        navigationPrevented: navigationPreventionReducer,
        idle: idleReducer,
    });
}

// Helper function, to determine if show loading
export function showLoading(state: State, identifier: string = "global") {
    return state.loading[identifier] > 0;
}

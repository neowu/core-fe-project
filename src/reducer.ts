import {connectRouter, RouterState} from "connected-react-router";
import {History} from "history";
import {Action as ReduxAction, combineReducers, Reducer} from "redux";

// Redux State
interface LoadingState {
    [loading: string]: number;
}

export interface State {
    loading: LoadingState;
    router: RouterState;
    navigationPrevented: boolean;
    app: object;
    idleStartingTime: number | null;
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

// Redux Action: Idle Starting Time (to update state.idleStartingTime)
interface IdleStartingTimeActionPayload {
    time: number | null;
}

const IDLE_STARTING_TIME_ACTION = "@@framework/idle-starting-time";

export function idleStartingTimeAction(time: number | null): Action<IdleStartingTimeActionPayload> {
    return {
        type: IDLE_STARTING_TIME_ACTION,
        payload: {time},
    };
}

function idleStartingTimeReducer(state: number | null = null, action: Action<IdleStartingTimeActionPayload>): number | null {
    if (action.type === IDLE_STARTING_TIME_ACTION) {
        const payload = action.payload as IdleStartingTimeActionPayload;
        return payload.time;
    }
    return state;
}

// Root Reducer
export function rootReducer(history: History): Reducer<State> {
    return combineReducers<State>({
        router: connectRouter(history),
        loading: loadingReducer,
        app: setStateReducer,
        navigationPrevented: navigationPreventionReducer,
        idleStartingTime: idleStartingTimeReducer,
    });
}

// Helper function, to determine if show loading
export function showLoading(state: State, identifier: string = "global") {
    return state.loading[identifier] > 0;
}

import {Reducer} from "redux";
import {initialState, LoadingState, State} from "../state";
import {Action} from "../type";

const SET_STATE_ACTION: string = "@@framework/setState";

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

export function setStateReducer(state: State["app"] = {}, action: Action<SetStateActionPayload>): State["app"] {
    const {module, state: moduleState} = action.payload;
    return {...state, [module]: {...state[module], ...moduleState}};
}

interface LoadingActionPayload {
    identifier: string;
    show: boolean;
}

const LOADING_ACTION = "@@framework/loading";

export function loadingAction(identifier: string, show: boolean): Action<LoadingActionPayload> {
    return {
        type: LOADING_ACTION,
        payload: {identifier, show},
    };
}

function loadingReducer(state: LoadingState = {}, action: Action<LoadingActionPayload>): LoadingState {
    const payload = action.payload;
    const count = state[payload.identifier] || 0;
    return {
        ...state,
        [payload.identifier]: count + (payload.show ? 1 : -1),
    };
}

export function rootReducer(): Reducer<State> {
    return (state: State = initialState, action): State => {
        // use action.name for set state action, make type specifiable to make tracking/tooling easier
        if (action.name === SET_STATE_ACTION) {
            const nextState: State = {...state};
            nextState.app = setStateReducer(nextState.app, action as Action<SetStateActionPayload>);
            return nextState;
        } else if (action.type === LOADING_ACTION) {
            const nextState: State = {...state};
            nextState.loading = loadingReducer(nextState.loading, action as Action<LoadingActionPayload>);
            return nextState;
        }
        return state;
    };
}

import {Reducer} from "redux";
import {initialState, LoadingState, State} from "../state";
import {Action} from "../type";

const SET_STATE_ACTION_TYPE: string = "@@framework/setState";

interface SetStateActionPayload {
    module: string;
    state: any;
}

export function setStateAction(module: string, state: object): Action<SetStateActionPayload> {
    return {
        type: SET_STATE_ACTION_TYPE,
        payload: {module, state},
    };
}

export function setStateReducer(state: State["app"] = {}, action: Action<SetStateActionPayload>): State["app"] {
    const {module, state: moduleState} = action.payload;
    return {...state, [module]: {...state[module], ...moduleState}};
}

interface LoadingActionPayload {
    loading: string;
    show: boolean;
}

const LOADING_ACTION_TYPE = "@@framework/loading";

export function loadingAction(loading: string, show: boolean): Action<LoadingActionPayload> {
    return {
        type: LOADING_ACTION_TYPE,
        payload: {loading, show},
    };
}

function loadingReducer(state: LoadingState = {}, action: Action<LoadingActionPayload>): LoadingState {
    const payload = action.payload;
    const count = state[payload.loading] || 0;
    return {
        ...state,
        [payload.loading]: count + (payload.show ? 1 : -1),
    };
}

export function rootReducer(): Reducer<State> {
    return (state: State = initialState, action): State => {
        if (action.type === LOADING_ACTION_TYPE) {
            const nextState: State = {...state};
            nextState.loading = loadingReducer(nextState.loading, action as Action<LoadingActionPayload>);
            return nextState;
        } else if (action.type === SET_STATE_ACTION_TYPE) {
            const nextState: State = {...state};
            nextState.app = setStateReducer(nextState.app, action as Action<SetStateActionPayload>);
            return nextState;
        }
        return state;
    };
}

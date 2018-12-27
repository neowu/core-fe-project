import {LocationChangeAction, RouterState} from "connected-react-router";
import {combineReducers, Reducer} from "redux";
import {LoadingState, State} from "../state";
import {Action} from "../type";

// For SetState Action (to update state.app)
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

export function setStateReducer(state: State["app"] = {}, action: Action<any>): State["app"] {
    // Use action.name to determine the type of action, leave action.type customizable in order to make redux chrome plugin more dev friendly
    if (action.name === SET_STATE_ACTION) {
        const {module, state: moduleState} = action.payload as SetStateActionPayload;
        return {...state, [module]: {...state[module], ...moduleState}};
    }
    return state;
}

// For Loading Action (to update state.loading)
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

function loadingReducer(state: LoadingState = {}, action: Action<any>): LoadingState {
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

// Root Reducer
export function createRootReducer(routerReducer: Reducer<RouterState, LocationChangeAction>): Reducer<State> {
    return combineReducers<State>({
        router: routerReducer,
        loading: loadingReducer,
        app: setStateReducer,
    });
}

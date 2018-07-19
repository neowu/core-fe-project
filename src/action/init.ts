import {State} from "../state";
import {Action} from "./index";

export const INIT_STATE_ACTION_TYPE: string = "@@framework/initState";

interface InitStateActionPayload {
    namespace: string;
    state: any;
}

export function initStateAction(namespace: string, state: any): Action<InitStateActionPayload> {
    return {
        type: INIT_STATE_ACTION_TYPE,
        payload: {namespace, state},
    };
}

export function initStateReducer(state: State["app"] = {}, action: Action<InitStateActionPayload>): State["app"] {
    const {namespace, state: initialState} = action.payload;
    return {...state, [namespace]: initialState};
}

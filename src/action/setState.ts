import {State} from "../state";
import {Action} from "../type";

export const SET_STATE_ACTION_TYPE: string = "@@framework/setState";

export interface SetStateActionPayload {
    namespace: string;
    state: any;
}

export function setStateAction(namespace: string, state: object): Action<SetStateActionPayload> {
    return {
        type: SET_STATE_ACTION_TYPE,
        payload: {namespace, state},
    };
}

export function setStateReducer(state: State["app"] = {}, action: Action<SetStateActionPayload>): State["app"] {
    const {namespace, state: initialState} = action.payload;
    return {...state, [namespace]: initialState};
}

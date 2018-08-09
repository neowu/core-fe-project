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

type StateOfApp = State["app"];
export function setStateReducer(prevState: StateOfApp = {}, action: Action<SetStateActionPayload>): StateOfApp {
    const {namespace, state} = action.payload;
    return {...prevState, [namespace]: {...prevState[namespace], ...state}};
}

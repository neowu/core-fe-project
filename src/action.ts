import {Action as ReduxAction} from "redux";
import {Handler, qualifiedActionType} from "./handler";
import {State} from "./state";

export interface Action<P> extends ReduxAction {
    type: string;
    payload: P;
}

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

type ActionCreator0 = () => Action<undefined>;
type ActionCreator1<P> = (payload: P) => Action<P>;
type ActionCreators<A> = {readonly [K in keyof A]: A[K] extends (payload: void) => any ? ActionCreator0 : A[K] extends (payload: infer P) => any ? ActionCreator1<P> : never};

// usage: const actions = actionCreator<Actions>(namespace, handler);
export function actionCreator<A>(namespace: string, actionHandler: A): ActionCreators<A> {
    const actionCreators = {};
    Object.keys(Object.getPrototypeOf(actionHandler)).forEach(actionType => {
        const handler: Handler<any> = actionHandler[actionType];
        const type = qualifiedActionType(handler, namespace, actionType);
        actionCreators[actionType] = (payload?: any) => ({type, payload});
    });
    return actionCreators as ActionCreators<A>;
}

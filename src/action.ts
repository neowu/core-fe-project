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
type ActionCreators<A> = {readonly [K in keyof A]: A[K] extends () => void ? ActionCreator0 : A[K] extends (payload: infer P) => void ? ActionCreator1<P> : never};
type Actions<A> = {[K in keyof A]: (payload?: any) => void}; // all methods in Actions must be (payload?) => void
type HandlerPrototype<A> = {[K in keyof A]: any}; // ActionHandler must have all methods defined in Actions

// usage: const actions = actionCreator<Actions>(namespace, ActionHandler.prototype);
export function actionCreator<A extends Actions<A>>(namespace: string, handlerPrototype: HandlerPrototype<A>): ActionCreators<A> {
    const actionCreators = {};
    Object.keys(handlerPrototype).forEach(actionType => {
        const handler: Handler<any> = handlerPrototype[actionType];
        const type = qualifiedActionType(handler, namespace, actionType);
        actionCreators[actionType] = (payload?: any) => ({type, payload});
    });
    return actionCreators as ActionCreators<A>;
}

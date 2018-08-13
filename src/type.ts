import {LOCATION_CHANGE} from "connected-react-router";
import {History} from "history";
import {Action as ReduxAction, Store} from "redux";
import {SagaIterator, SagaMiddleware} from "redux-saga";
import {ERROR_ACTION_TYPE} from "./action/error";
import {State} from "./state";

export interface Action<P> extends ReduxAction<string> {
    payload: P;
}

export interface App {
    readonly store: Store<State>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly handlers: Handlers;
    readonly modules: {[module: string]: boolean}; // whether module is loaded
}

export type EffectHandler = (...args: any[]) => SagaIterator;

export class Handlers {
    readonly effects: {[actionType: string]: EffectHandler} = {};
    readonly listenerEffects: {[actionType: string]: EffectHandler[]} = {
        [LOCATION_CHANGE]: [],
        [ERROR_ACTION_TYPE]: [],
    };
}

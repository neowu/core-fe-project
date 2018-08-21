import {History} from "history";
import {Action as ReduxAction, Store} from "redux";
import {SagaMiddleware} from "redux-saga";
import {Handlers} from "./action/handler";
import {State} from "./state";

export interface Action<P> extends ReduxAction<string> {
    name?: string;
    payload: P;
}

export interface App {
    readonly store: Store<State>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly handlers: Handlers;
    readonly modules: {[module: string]: boolean}; // whether module is loaded
}

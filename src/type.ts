import {History} from "history";
import {Action as ReduxAction, Store} from "redux";
import {SagaMiddleware} from "redux-saga";
import {HandlerStore} from "./action/store";
import {State} from "./state";

export interface Action<P> extends ReduxAction<string> {
    payload: P;
}

export interface App {
    readonly store: Store<State>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly handlers: HandlerStore;
    readonly modules: {[module: string]: boolean}; // whether module is loaded
}

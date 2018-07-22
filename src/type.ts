import {RouterState} from "connected-react-router";
import {Action as HistoryAction, History, Location} from "history";
import {Action as ReduxAction, Store} from "redux";
import {SagaIterator, SagaMiddleware} from "redux-saga";
import {LoadingState} from "./action/loading";
import {Exception} from "./exception";

export interface Action<P> extends ReduxAction<string> {
    payload: P;
}

export interface State {
    router: RouterState | null;
    loading: LoadingState;
    app: {};
}

export type ActionHandler<S> = ((...args: any[]) => S | SagaIterator) & {
    namespace?: string;
    loading?: string;
};

export interface ActionHandlers {
    [actionType: string]: Array<ActionHandler<any>>;
}

export interface App {
    readonly store: Store<State, Action<any>>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly reducers: ActionHandlers;
    readonly effects: ActionHandlers;
    readonly namespaces: Set<string>;
}

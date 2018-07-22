import {RouterState} from "connected-react-router";
import {History} from "history";
import {Action as ReduxAction, Store} from "redux";
import {SagaIterator, SagaMiddleware} from "redux-saga";
import {LocationChangedEvent} from "./action/listener";
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

export type ReducerHandler<S> = ((...args: any[]) => S) & {
    namespace: string;
};
export type EffectHandler = ((...args: any[]) => SagaIterator) & {
    loading?: string;
};
export type ErrorHandler = (error: Exception) => SagaIterator;
export type LocationChangeHandler = (event: LocationChangedEvent) => SagaIterator;

export interface App {
    readonly store: Store<State, Action<any>>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly reducers: {[actionType: string]: ReducerHandler<any>}; // TODO: extract following to class
    readonly effects: {[actionType: string]: EffectHandler};
    readonly onErrorEffects: ErrorHandler[];
    readonly onLocationChangeEffects: LocationChangeHandler[];
    readonly namespaces: Set<string>;
}

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
    loading?: string;
    global?: boolean;
};

export interface ActionHandlers {
    [actionType: string]: {[namespace: string]: ActionHandler<any>};
}

export interface App {
    readonly store: Store<State, Action<any>>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly reducers: ActionHandlers;
    readonly effects: ActionHandlers;
    readonly namespaces: Set<string>;
}

export interface Listener {
    onInitialized?(): SagaIterator;

    onLocationChanged?(event: LocationChangedEvent): SagaIterator;

    onError?(error: Exception): SagaIterator;

    onTick?(): SagaIterator;
}

export interface LocationChangedEvent {
    location: Location;
    action: HistoryAction;
}

// Actions can have maximum 5 parameters
type ActionCreator0 = () => Action<void[]>;
type ActionCreator1<P> = (arg1: P) => Action<[P]>;
type ActionCreator2<P1, P2> = (arg1: P1, arg2: P2) => Action<[P1, P2]>;
type ActionCreator3<P1, P2, P3> = (arg1: P1, arg2: P2, arg3: P3) => Action<[P1, P2, P3]>;
type ActionCreator4<P1, P2, P3, P4> = (arg1: P1, arg2: P2, arg3: P3, arg4: P4) => Action<[P1, P2, P3, P4]>;
type ActionCreator5<P1, P2, P3, P4, P5> = (arg1: P1, arg2: P2, arg3: P3, arg4: P4, arg5: P5) => Action<[P1, P2, P3, P4, P5]>;

// If ActionCreator is in-lined into ActionCreators, IDE cannot get correct Type infer information
type ActionCreator<H> = H extends () => any
    ? ActionCreator0
    : H extends (arg1: infer P1) => any
        ? ActionCreator1<P1>
        : H extends (arg1: infer P1, arg2: infer P2) => any
            ? ActionCreator2<P1, P2>
            : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3) => any
                ? ActionCreator3<P1, P2, P3>
                : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3, arg4: infer P4) => any ? ActionCreator4<P1, P2, P3, P4> : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3, arg4: infer P4, arg5: infer P5) => any ? ActionCreator5<P1, P2, P3, P4, P5> : never;

export type ActionCreators<A> = {readonly [K in Exclude<keyof A, "state" | "rootState" | keyof Listener>]: ActionCreator<A[K]>};

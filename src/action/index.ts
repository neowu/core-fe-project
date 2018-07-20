import {LOCATION_CHANGE} from "connected-react-router";
import {Action as ReduxAction} from "redux";
import {delay, SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {app} from "../app";
import {ERROR_ACTION_TYPE} from "../exception";
import {Listener, LocationChangedEvent, TickListener} from "../listener";
import {State} from "../state";
import {ActionHandler, run} from "./handler";
import {initStateAction} from "./init";

export interface Action<P> extends ReduxAction<string> {
    payload: P;
}

// Actions can have maximum 5 parameters
type ActionCreator0 = () => Action<null>;
type ActionCreator1<P> = (arg1: P) => Action<[P]>;
type ActionCreator2<P1, P2> = (arg1: P1, arg2: P2) => Action<[P1, P2]>;
type ActionCreator3<P1, P2, P3> = (arg1: P1, arg2: P2, arg3: P3) => Action<[P1, P2, P3]>;
type ActionCreator4<P1, P2, P3, P4> = (arg1: P1, arg2: P2, arg3: P3, arg4: P4) => Action<[P1, P2, P3, P4]>;
type ActionCreator5<P1, P2, P3, P4, P5> = (arg1: P1, arg2: P2, arg3: P3, arg4: P4, arg5: P5) => Action<[P1, P2, P3, P4, P5]>;

// If ActionCreator is in-lined into ActionCreators, IDE cannot get correct Type infer information
type ActionCreator<H> = H extends () => any
    ? ActionCreator0
    : H extends (_: infer P1) => any
        ? ActionCreator1<P1>
        : H extends (arg1: infer P1, arg2: infer P2) => any
            ? ActionCreator2<P1, P2>
            : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3) => any
                ? ActionCreator3<P1, P2, P3>
                : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3, arg4: infer P4) => any ? ActionCreator4<P1, P2, P3, P4> : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3, arg4: infer P4, arg5: infer P5) => any ? ActionCreator5<P1, P2, P3, P4, P5> : never;

// Exclude: state & Listener functions
type ActionCreators<A> = {readonly [K in Exclude<keyof A, "state" | keyof Listener>]: ActionCreator<A[K]>};

export abstract class Handler<S extends object> {
    readonly namespace: string;
    private readonly initialState: S;

    protected constructor(namespace: string, initialState: S) {
        this.namespace = namespace;
        this.initialState = initialState;
    }

    state(): Readonly<S> {
        return app.store.getState().app[this.namespace];
    }

    rootState(): Readonly<State> {
        return app.store.getState();
    }

    resetState(): Readonly<S> {
        return this.initialState;
    }

    reduceState(newState: Partial<S>): S {
        return Object.assign({}, this.state() as S, newState);
    }
}

export function register<S extends object, A extends Handler<S>>(actions: A): ActionCreators<A> {
    if (app.namespaces.has(actions.namespace)) {
        throw new Error(`namespace is already registered, namespace=${actions.namespace}`);
    }

    const actionCreators = {};

    registerHandlers(Object.getPrototypeOf(actions));
    registerHandlers(Handler.prototype);

    // initialize the state
    app.store.dispatch(initStateAction(actions.namespace, actions.state));
    registerListener(actions);

    return actionCreators as ActionCreators<A>;
}

function registerHandlers<A extends Handler<any>>(actionPrototype: A, actions: A) {
    Object.keys(actionPrototype).forEach(actionType => {
        if (actionType === "state") {
            return;
        }

        const handler: ActionHandler = actionPrototype[actionType];
        const qualifiedActionType = handler.global ? actionType : `${actions.namespace}/${actionType}`;

        const isGenerator = handler.toString().indexOf('["__generator"]') > 0;
        app.namespaces.add(actions.namespace);

        if (isGenerator) {
            app.effects.put(qualifiedActionType, actions.namespace, handler.bind(actions));
        } else {
            app.reducers.put(qualifiedActionType, actions.namespace, handler.bind(actions));
        }

        actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
    });
}

function registerListener<A extends Handler<any>>(actions: A) {
    const listener = actions as Listener;
    if (listener.onLocationChanged) {
        app.effects.put(LOCATION_CHANGE, actions.namespace, listener.onLocationChanged.bind(listener));
    }
    if (listener.onError) {
        app.effects.put(ERROR_ACTION_TYPE, actions.namespace, listener.onError.bind(listener));
    }
    app.sagaMiddleware.run(initializeListener, listener);
}

// initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
function* initializeListener(listener: Listener): SagaIterator {
    if (listener.onInitialized) {
        yield call(run, listener.onInitialized.bind(listener));
    }

    if (listener.onLocationChanged) {
        const event: LocationChangedEvent = {location: app.history.location, action: "PUSH"};
        yield call(run, listener.onLocationChanged.bind(listener), [event]); // history listener won't trigger on first refresh or on module loading, manual trigger once
    }

    const onTick = listener.onTick as TickListener;
    if (onTick) {
        yield* tick(onTick.bind(listener), onTick.interval);
    }
}

export function* tick(onTick: TickListener, interval?: number) {
    while (true) {
        // use call instead of fork, to delay next tick execution if onTick() took long. usually, it will not happen! Because we only put(action) within most onTick(), which is a non-blocking effect.
        yield call(run, onTick);
        yield call(delay, (interval || 1) * 1000);
    }
}

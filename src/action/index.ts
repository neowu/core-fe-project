import {LOCATION_CHANGE} from "connected-react-router";
import {Action as ReduxAction} from "redux";
import {delay, SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {app} from "../app";
import {ERROR_ACTION_TYPE} from "../exception";
import {Listener, LocationChangedEvent, TickListener} from "../listener";
import {ActionFunction, run} from "./function";
import {initStateAction} from "./init";

export interface Action<P> extends ReduxAction<string> {
    payload: P;
}

// Actions can support maximum 5 parameters
type ActionCreator0 = () => Action<null>;
type ActionCreator1<P> = (_: P) => Action<[P]>;
type ActionCreator2<P1, P2> = (_1: P1, _2: P2) => Action<[P1, P2]>;
type ActionCreator3<P1, P2, P3> = (_1: P1, _2: P2, _3: P3) => Action<[P1, P2, P3]>;
type ActionCreator4<P1, P2, P3, P4> = (_1: P1, _2: P2, _3: P3, _4: P4) => Action<[P1, P2, P3, P4]>;
type ActionCreator5<P1, P2, P3, P4, P5> = (_1: P1, _2: P2, _3: P3, _4: P4, _5: P5) => Action<[P1, P2, P3, P4, P5]>;

// If MatchedActionCreator is in-lined into ActionCreators, IDE cannot get correct Type infer information
type MatchedActionCreator<F> = F extends () => any
    ? ActionCreator0
    : F extends (_: infer P1) => any
        ? ActionCreator1<P1>
        : F extends (_1: infer P1, _2: infer P2) => any
            ? ActionCreator2<P1, P2>
            : F extends (_1: infer P1, _2: infer P2, _3: infer P3) => any
                ? ActionCreator3<P1, P2, P3>
                : F extends (_1: infer P1, _2: infer P2, _3: infer P3, _4: infer P4) => any ? ActionCreator4<P1, P2, P3, P4> : F extends (_1: infer P1, _2: infer P2, _3: infer P3, _4: infer P4, _5: infer P5) => any ? ActionCreator5<P1, P2, P3, P4, P5> : never;

// Exclude: state & Listener functions
type ActionCreators<A> = {readonly [K in Exclude<keyof A, "state" | keyof Listener>]: MatchedActionCreator<A[K]>};

// Ref: https://github.com/Microsoft/TypeScript/issues/13923
// Maybe we can use DeepReadonly for better safety

export abstract class BaseAction<S> {
    readonly state: Readonly<S>;
    private readonly initialState: S;
    protected constructor(initialState: S) {
        this.initialState = initialState;
        this.state = initialState;
    }

    resetState(): S {
        return this.initialState;
    }

    reduceState(newState: Partial<S>): S {
        return Object.assign({}, this.state, newState);
    }
}

interface ActionStoreItem {
    [namespace: string]: ActionFunction;
}

export class ActionStore {
    readonly reducers: {[actionType: string]: ActionStoreItem} = {};
    readonly effects: {[actionType: string]: ActionStoreItem} = {};
    readonly contextObjects: {[namespace: string]: BaseAction<any>} = {};

    public hasNamespace(namespace: string): boolean {
        return this.contextObjects.hasOwnProperty(namespace);
    }

    public putContextObject(namespace: string, contextObject: BaseAction<any>) {
        if (!this.hasNamespace(namespace)) {
            this.contextObjects[namespace] = contextObject;
        }
    }

    public put(actionType: string, namespace: string, handler: ActionFunction, isReducer: boolean): void {
        const stores = isReducer ? this.reducers : this.effects;
        if (!stores[actionType]) {
            stores[actionType] = {};
        }
        stores[actionType][namespace] = handler;
    }

    public getReducers(actionType: string): ActionStoreItem {
        return this.reducers[actionType];
    }

    public getEffects(actionType: string): ActionStoreItem {
        return this.effects[actionType];
    }
}

export function createAndRegisterActions<S, A extends BaseAction<S>>(namespace: string, actionObject: A): ActionCreators<A> {
    const actionCreators = {};
    if (!app.actions.hasNamespace(namespace)) {
        const excludedProperties = ["constructor", "onInitialized", "onLocationChanged", "onError", "onTick"];
        const addPrototypeToContext = (actionPrototype: any) => {
            Object.keys(actionPrototype).forEach(actionType => {
                if (!excludedProperties.includes(actionType)) {
                    const actionFunction: ActionFunction = actionPrototype[actionType];
                    const fullActionType = actionFunction.global ? actionType : `${namespace}/${actionType}`;

                    // const isGenerator = actionFunction.effect === true;
                    const isGenerator = actionFunction.toString().indexOf('["__generator"]') > 0;
                    const boundActionFunction = actionFunction.bind(actionObject); // Very Important !

                    // console.info("%c " + actionFunction.toString(), "background:#333;color:#888");
                    // console.info(`${fullActionType}, parameter length = ${actionFunction.length}, isGenerator = ${isGenerator}`);

                    // Add to global context
                    app.actions.putContextObject(namespace, actionObject);
                    app.actions.put(fullActionType, namespace, boundActionFunction, !isGenerator);

                    // Generate item in ActionCreator
                    actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: fullActionType, payload});
                }
            });
        };

        if (actionObject) {
            addPrototypeToContext(Object.getPrototypeOf(actionObject));
            addPrototypeToContext(BaseAction.prototype);

            // initialize the state
            app.store.dispatch(initStateAction(namespace, actionObject.state));

            // try to parse as listener
            const listener = actionObject as Listener;
            if (listener.onLocationChanged) {
                app.actions.put(LOCATION_CHANGE, namespace, listener.onLocationChanged, false);
            }
            if (listener.onError) {
                app.actions.put(ERROR_ACTION_TYPE, namespace, listener.onError, false);
            }

            app.sagaMiddleware.run(initializeModule, listener);
        }
    }

    return actionCreators as ActionCreators<A>;
}

// initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
function* initializeModule(listener: Listener): SagaIterator {
    if (listener.onInitialized) {
        yield call(run, listener.onInitialized);
    }

    if (listener.onLocationChanged) {
        const event: LocationChangedEvent = {location: app.history.location, action: "PUSH"};
        yield call(run, listener.onLocationChanged, event); // history listener won't trigger on first refresh or on module loading, manual trigger once
    }

    const onTick = listener.onTick as TickListener;
    if (onTick) {
        while (true) {
            // use call instead of fork, to delay next tick execution if onTick() took long. usually, it will not happen! Because we only put(action) within most onTick(), which is a non-blocking effect.
            yield call(run, onTick);
            yield call(delay, (onTick.interval || 1) * 1000);
        }
    }
}

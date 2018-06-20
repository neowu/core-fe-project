import {LOCATION_CHANGE} from "connected-react-router";
import {delay, SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {initStateAction} from "../action";
import {app} from "../app";
import {ERROR_ACTION_TYPE} from "../exception";
import {Handler, qualifiedActionType, run} from "../handler";
import {Listener, LocationChangedEvent, TickListener} from "../listener";

type ActionHandler<H, S> = {[K in keyof H]: Handler<S>};

export function register<H, S>(module: {namespace: string; handler?: ActionHandler<H, S>; initialState?: S; listener?: Listener}): void {
    const {namespace, handler, initialState, listener} = module;
    if (!app.namespaces.has(namespace)) {
        app.namespaces.add(namespace);
        console.info(`[framework] register module, namespace=${namespace}`);

        if (handler) {
            registerHandler(namespace, handler, initialState);
        }
        if (listener) {
            registerListener(namespace, listener);
        }
    }
}

function registerHandler<H, S>(namespace: string, handlers: ActionHandler<H, S>, initialState: S): void {
    for (const actionType of Object.keys(Object.getPrototypeOf(handlers))) {
        const handler: Handler<S> = handlers[actionType];

        const type = qualifiedActionType(handler, namespace, actionType);
        if (handler.effect === true) {
            console.info(`[framework] add effect, namespace=${namespace}, actionType=${type}, loading=${handler.loading}`);
            if (!handler.global || !app.sagaActionTypes.includes(type)) {
                app.sagaActionTypes.push(type); // saga takeLatest() requires string[], global action type could exists in multiple modules
            }
            app.effects.put(type, namespace, handler);
        } else {
            console.info(`[framework] add reducer, namespace=${namespace}, actionType=${type}`);
            app.reducers.put(type, namespace, handler);
        }
    }

    initializeState(namespace, initialState);
}

function registerListener(namespace: string, listener: Listener): void {
    if (listener.onLocationChanged) {
        app.effects.put(LOCATION_CHANGE, namespace, listener.onLocationChanged); // LocationChangedActionType is already in app.sagaActionTypes
    }
    if (listener.onError) {
        app.effects.put(ERROR_ACTION_TYPE, namespace, listener.onError); // ERROR_ACTION_TYPE is already in app.sagaActionTypes
    }

    app.sagaMiddleware.run(initializeModule, listener);
}

function initializeState(namespace: string, initialState: any): void {
    app.store.dispatch(initStateAction(namespace, initialState));
}

// initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
export function* initializeModule(listener: Listener): SagaIterator {
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

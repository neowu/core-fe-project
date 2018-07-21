import {LOCATION_CHANGE} from "connected-react-router";
import {delay, SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {Handler} from "../app";
import {ERROR_ACTION_TYPE} from "../exception";
import {Listener, LocationChangedEvent, TickListener} from "../listener";
import {App, HandlerMethod, HandlerMethods} from "../type";
import {run} from "./handler";
import {initStateAction} from "./init";

export function registerHandler<S extends object, H extends Handler<S>>(handler: H, app: App): void {
    if (app.namespaces.has(handler.namespace)) {
        throw new Error(`namespace is already registered, namespace=${handler.namespace}`);
    }
    app.namespaces.add(handler.namespace);

    const keys = [...Object.keys(Object.getPrototypeOf(handler)).filter(key => key !== "constructor"), "resetState"];
    keys.forEach(actionType => {
        const method: HandlerMethod<any> = handler[actionType];
        const qualifiedActionType = method.global ? actionType : `${handler.namespace}/${actionType}`;
        const isGenerator = method.toString().indexOf('["__generator"]') > 0;

        if (isGenerator) {
            put(app.effects, qualifiedActionType, handler.namespace, bindEffect(method, handler));
        } else {
            put(app.reducers, qualifiedActionType, handler.namespace, method.bind(handler));
        }
    });

    // initialize the state
    app.store.dispatch(initStateAction(handler.namespace, handler.resetState()));
    registerListener(handler, app);
}

function bindEffect(method: HandlerMethod<any>, handler: any): HandlerMethod<any> {
    const boundMethod: HandlerMethod<any> = method.bind(handler);
    boundMethod.loading = method.loading;
    return boundMethod;
}

function put(handlers: HandlerMethods, actionType: string, namespace: string, handler: HandlerMethod<any>): void {
    if (!handlers[actionType]) {
        handlers[actionType] = {};
    }
    handlers[actionType][namespace] = handler;
}

function registerListener<A extends Handler<any>>(handler: A, app: App) {
    const listener = handler as Listener;
    if (listener.onLocationChanged) {
        put(app.effects, LOCATION_CHANGE, handler.namespace, bindEffect(listener.onLocationChanged, listener));
    }
    if (listener.onError) {
        put(app.effects, ERROR_ACTION_TYPE, handler.namespace, bindEffect(listener.onError, listener));
    }
    app.sagaMiddleware.run(initializeListener, listener, app);
}

// initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
function* initializeListener(listener: Listener, app: App): SagaIterator {
    if (listener.onInitialized) {
        yield call(run, bindEffect(listener.onInitialized, listener), []);
    }

    if (listener.onLocationChanged) {
        const event: LocationChangedEvent = {location: app.history.location, action: "PUSH"};
        yield call(run, bindEffect(listener.onLocationChanged, listener), [event]); // history listener won't trigger on first refresh or on module loading, manual trigger once
    }

    const onTick = listener.onTick as TickListener;
    if (onTick) {
        yield* tick(bindEffect(onTick, listener), onTick.interval);
    }
}

export function* tick(onTick: TickListener, interval?: number): SagaIterator {
    while (true) {
        // use call instead of fork, to delay next tick execution if onTick() took long. usually, it will not happen! Because we only put(action) within most onTick(), which is a non-blocking effect.
        yield call(run, onTick, []);
        yield call(delay, (interval || 1) * 1000);
    }
}

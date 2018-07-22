import {SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {App, EffectHandler, ReducerHandler} from "../type";
import {Handler, run} from "./handler";
import {initStateAction} from "./init";
import {Listener, LocationChangedEvent, tick, TickListener} from "./listener";

export function registerHandler(handler: Handler<any>, app: App): void {
    if (app.namespaces.has(handler.namespace)) {
        throw new Error(`namespace is already registered, namespace=${handler.namespace}`);
    }
    app.namespaces.add(handler.namespace);

    const keys = [...Object.keys(Object.getPrototypeOf(handler)).filter(key => key !== "constructor"), "resetState"];
    keys.forEach(actionType => {
        const method = handler[actionType];
        const qualifiedActionType = `${handler.namespace}/${actionType}`;

        const isGenerator = method.toString().indexOf('["__generator"]') > 0;
        if (isGenerator) {
            app.effects[qualifiedActionType] = effectHandler(method, handler);
        } else {
            app.reducers[qualifiedActionType] = reducerHandler(method, handler);
        }
    });

    // initialize the state
    app.store.dispatch(initStateAction(handler.namespace, handler.resetState()));
    registerListener(handler, app);
}

function reducerHandler<S extends object>(method: (...args: any[]) => S, handler: Handler<S>): ReducerHandler<S> {
    const boundMethod: ReducerHandler<S> = method.bind(handler);
    boundMethod.namespace = handler.namespace;
    return boundMethod;
}

function effectHandler(method: EffectHandler, handler: Handler<any>): EffectHandler {
    const boundMethod: EffectHandler = method.bind(handler);
    boundMethod.loading = method.loading;
    return boundMethod;
}

function registerListener(handler: Handler<any>, app: App) {
    const listener = handler as Listener;
    if (listener.onLocationChanged) {
        app.onLocationChangeEffects.push(effectHandler(listener.onLocationChanged, handler));
    }
    if (listener.onError) {
        app.onErrorEffects.push(effectHandler(listener.onError, handler));
    }
    app.sagaMiddleware.run(initializeListener, handler, app);
}

// initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
function* initializeListener(handler: Handler<any>, app: App): SagaIterator {
    const listener = handler as Listener;
    if (listener.onInitialized) {
        yield call(run, effectHandler(listener.onInitialized, handler), []);
    }

    if (listener.onLocationChanged) {
        const event: LocationChangedEvent = {location: app.history.location, action: "PUSH"};
        yield call(run, effectHandler(listener.onLocationChanged, handler), [event]); // history listener won't trigger on first refresh or on module loading, manual trigger once
    }

    const onTick = listener.onTick as TickListener;
    if (onTick) {
        yield* tick(effectHandler(onTick, handler), onTick.interval);
    }
}

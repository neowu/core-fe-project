import {LOCATION_CHANGE} from "connected-react-router";
import {SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {ERROR_ACTION_TYPE} from "../exception";
import {ActionHandler, ActionHandlers, App} from "../type";
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
        const method: ActionHandler<any> = handler[actionType];
        const qualifiedActionType = `${handler.namespace}/${actionType}`;

        const isGenerator = method.toString().indexOf('["__generator"]') > 0;
        if (isGenerator) {
            put(app.effects, qualifiedActionType, actionHandler(method, handler));
        } else {
            put(app.reducers, qualifiedActionType, actionHandler(method, handler));
        }
    });

    // initialize the state
    app.store.dispatch(initStateAction(handler.namespace, handler.resetState()));
    registerListener(handler, app);
}

function actionHandler<S extends object>(method: ActionHandler<S>, handler: Handler<S>): ActionHandler<any> {
    const boundMethod: ActionHandler<any> = method.bind(handler);
    boundMethod.loading = method.loading;
    boundMethod.namespace = handler.namespace;
    return boundMethod;
}

function put(handlers: ActionHandlers, actionType: string, handler: ActionHandler<any>): void {
    if (!handlers[actionType]) {
        handlers[actionType] = [];
    }
    handlers[actionType].push(handler);
}

function registerListener(handler: Handler<any>, app: App) {
    const listener = handler as Listener;
    if (listener.onLocationChanged) {
        put(app.effects, LOCATION_CHANGE, actionHandler(listener.onLocationChanged, handler));
    }
    if (listener.onError) {
        put(app.effects, ERROR_ACTION_TYPE, actionHandler(listener.onError, handler));
    }
    app.sagaMiddleware.run(initializeListener, handler, app);
}

// initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
function* initializeListener(handler: Handler<any>, app: App): SagaIterator {
    const listener = handler as Listener;
    if (listener.onInitialized) {
        yield call(run, actionHandler(listener.onInitialized, handler), []);
    }

    if (listener.onLocationChanged) {
        const event: LocationChangedEvent = {location: app.history.location, action: "PUSH"};
        yield call(run, actionHandler(listener.onLocationChanged, handler), [event]); // history listener won't trigger on first refresh or on module loading, manual trigger once
    }

    const onTick = listener.onTick as TickListener;
    if (onTick) {
        yield* tick(actionHandler(onTick, handler), onTick.interval);
    }
}

import {LOCATION_CHANGE} from "connected-react-router";
import ReactDOM from "react-dom";
import {SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {App} from "../type";
import {ERROR_ACTION_TYPE} from "./error";
import {Handler, run} from "./handler";
import {initStateAction} from "./init";
import {Listener, LocationChangedEvent, tick, TickListener} from "./listener";
import {EffectHandler, ReducerHandler} from "./store";

export function registerHandler(handler: Handler<any>, app: App) {
    keys(handler).forEach(actionType => {
        const method = handler[actionType];
        const qualifiedActionType = `${handler.namespace}/${actionType}`;

        if (method.effect) {
            app.handlers.effects[qualifiedActionType] = effectHandler(method, handler);
        } else {
            app.handlers.reducers[qualifiedActionType] = reducerHandler(method, handler);
        }
    });

    app.store.dispatch(initStateAction(handler.namespace, handler.resetState()));
    registerListener(handler, app);
}

export function keys(handler: Handler<any>): string[] {
    return [...Object.keys(Object.getPrototypeOf(handler)).filter(key => key !== "constructor"), "resetState"]; // there is always constructor in handler regardless declared in js
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
        app.handlers.listenerEffects[LOCATION_CHANGE].push(effectHandler(listener.onLocationChanged, handler));
    }
    if (listener.onError) {
        app.handlers.listenerEffects[ERROR_ACTION_TYPE].push(effectHandler(listener.onError, handler));
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

    // remove startup overlay
    app.moduleLoaded[handler.namespace] = true;
    if (app.startup && Object.values(app.moduleLoaded).every(_ => _)) {
        app.startup = false;
        setTimeout(() => {
            const startupElement: HTMLElement | null = document.getElementById("framework-startup-overlay");
            if (startupElement && startupElement.parentNode) {
                ReactDOM.unmountComponentAtNode(startupElement);
                startupElement.parentNode.removeChild(startupElement);
            }
        }, 10);
    }

    const onTick = listener.onTick as TickListener;
    if (onTick) {
        const tickHandler = effectHandler(onTick, handler) as TickListener;
        tickHandler.interval = onTick.interval;
        yield* tick(tickHandler);
    }
}

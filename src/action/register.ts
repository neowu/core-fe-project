import {LOCATION_CHANGE} from "connected-react-router";
import {SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {completeInitialization} from "../initialization";
import {App} from "../type";
import {ERROR_ACTION_TYPE} from "./error";
import {Handler, run} from "./handler";
import {Listener, LocationChangedEvent, tick, TickListener} from "./listener";
import {setStateAction} from "./reducer";

export function registerHandler(handler: Handler<any>, app: App) {
    keys(handler).forEach(actionType => {
        const method = handler[actionType];
        const qualifiedActionType = `${handler.module}/${actionType}`;
        app.handlers.effects[qualifiedActionType] = method.bind(handler);
    });

    // Use "as any" to get private-readonly initialState
    const initialState = (handler as any).initialState;
    app.store.dispatch(setStateAction(handler.module, initialState, `@@${handler.module}/initState`));
    registerListener(handler, app);
}

export function keys(handler: Handler<any>): string[] {
    // There is always constructor in handler regardless declared in js
    return Object.keys(Object.getPrototypeOf(handler)).filter(key => key !== "constructor");
}

function registerListener(handler: Handler<any>, app: App) {
    const listener = handler as Listener;
    if (listener.onLocationChanged) {
        app.handlers.listeners[LOCATION_CHANGE].push(listener.onLocationChanged.bind(handler));
    }
    if (listener.onError) {
        app.handlers.listeners[ERROR_ACTION_TYPE].push(listener.onError.bind(handler));
    }

    app.sagaMiddleware.run(initializeListener, handler, app);
}

// Initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
function* initializeListener(handler: Handler<any>, app: App): SagaIterator {
    const listener = handler as Listener;
    if (listener.onInitialized) {
        yield call(run, listener.onInitialized.bind(handler), []);
    }

    if (listener.onLocationChanged) {
        const event: LocationChangedEvent = {location: app.history.location, action: "PUSH"};
        yield call(run, listener.onLocationChanged.bind(handler), [event]); // History listener won't trigger on first refresh or on module loading, manual trigger once
    }

    app.modules[handler.module] = true;
    if (Object.values(app.modules).every(_ => _)) {
        completeInitialization(false);
    }

    const onTick = listener.onTick as TickListener;
    if (onTick) {
        const tickHandler = onTick.bind(handler) as TickListener;
        tickHandler.interval = onTick.interval;
        yield* tick(tickHandler);
    }
}

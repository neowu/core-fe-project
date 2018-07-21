import {LOCATION_CHANGE} from "connected-react-router";
import {delay, SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {Handler} from "../app";
import {ERROR_ACTION_TYPE} from "../exception";
import {Listener, LocationChangedEvent, TickListener} from "../listener";
import {Action, ActionCreators, ActionHandler, ActionHandlers, App} from "../type";
import {run} from "./handler";
import {initStateAction} from "./init";

const excludedActionTypes = ["constructor", "reduceState", "state", "rootState"];

export function actionCreator<S extends object, A extends Handler<S>>(actions: A) {
    const actionCreators = {};
    const build = (actionPrototype: any) => {
        Object.keys(actionPrototype)
            .filter(actionType => excludedActionTypes.indexOf(actionType) < 0)
            .forEach(actionType => {
                const handler: ActionHandler<any> = actionPrototype[actionType];
                const qualifiedActionType = handler.global ? actionType : `${actions.namespace}/${actionType}`;
                actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
            });
    };

    build(Object.getPrototypeOf(actions));
    build(Handler.prototype);

    return actionCreators as ActionCreators<A>;
}

export function registerActions<S extends object, A extends Handler<S>>(actions: A, app: App): ActionCreators<A> {
    if (app.namespaces.has(actions.namespace)) {
        throw new Error(`namespace is already registered, namespace=${actions.namespace}`);
    }

    const actionCreators = {};
    const registerHandlers = (actionPrototype: any) => {
        Object.keys(actionPrototype)
            .filter(actionType => excludedActionTypes.indexOf(actionType) < 0)
            .forEach(actionType => {
                const handler: ActionHandler<any> = actionPrototype[actionType];
                const qualifiedActionType = handler.global ? actionType : `${actions.namespace}/${actionType}`;

                const isGenerator = handler.toString().indexOf('["__generator"]') > 0;
                app.namespaces.add(actions.namespace);

                if (isGenerator) {
                    put(app.effects, qualifiedActionType, actions.namespace, handler.bind(actions));
                } else {
                    put(app.reducers, qualifiedActionType, actions.namespace, handler.bind(actions));
                }

                actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
            });
    };

    registerHandlers(Object.getPrototypeOf(actions));
    registerHandlers(Handler.prototype);

    // initialize the state
    app.store.dispatch(initStateAction(actions.namespace, actions.resetState()));
    registerListener(actions, app);

    return actionCreators as ActionCreators<A>;
}

function put(handlers: ActionHandlers, actionType: string, namespace: string, handler: ActionHandler<any>): void {
    if (!handlers[actionType]) {
        handlers[actionType] = {};
    }
    handlers[actionType][namespace] = handler;
}

function registerListener<A extends Handler<any>>(actions: A, app: App) {
    const listener = actions as Listener;
    if (listener.onLocationChanged) {
        put(app.effects, LOCATION_CHANGE, actions.namespace, listener.onLocationChanged.bind(listener));
    }
    if (listener.onError) {
        put(app.effects, ERROR_ACTION_TYPE, actions.namespace, listener.onError.bind(listener));
    }
    app.sagaMiddleware.run(initializeListener, listener, app);
}

// initialize module in one effect to make it deterministic, onInitialized -> onLocationChanged -> onTick (repeated)
function* initializeListener(listener: Listener, app: App): SagaIterator {
    if (listener.onInitialized) {
        yield call(run, listener.onInitialized.bind(listener), []);
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

export function* tick(onTick: TickListener, interval?: number): SagaIterator {
    while (true) {
        // use call instead of fork, to delay next tick execution if onTick() took long. usually, it will not happen! Because we only put(action) within most onTick(), which is a non-blocking effect.
        yield call(run, onTick, []);
        yield call(delay, (interval || 1) * 1000);
    }
}

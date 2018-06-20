import {ConnectedRouter, connectRouter, LOCATION_CHANGE, routerMiddleware} from "connected-react-router";
import {History} from "history";
import createHistory from "history/createBrowserHistory";
import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router-dom";
import {applyMiddleware, compose, createStore, Dispatch, Middleware, MiddlewareAPI, Reducer, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaIterator, SagaMiddleware} from "redux-saga";
import {call, takeEvery} from "redux-saga/effects";
import {Action, INIT_STATE_ACTION_TYPE, initStateReducer} from "./action";
import ErrorBoundary from "./component/ErrorBoundary";
import {ERROR_ACTION_TYPE, errorAction} from "./exception";
import {HandlerMap, run} from "./handler";
import {LOADING_ACTION_TYPE, loadingReducer} from "./loading";
import {initialState, State} from "./state";

interface App {
    readonly store: Store<State>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly namespaces: Set<string>;
    readonly reducers: HandlerMap;
    readonly sagaActionTypes: string[];
    readonly effects: HandlerMap;
}

console.time("[framework] initialized");
export const app = createApp();

export function render(component: ComponentType<any>, container: string): void {
    if (!component) {
        throw new Error("component must not be null");
    }
    const WithRouterComponent = withRouter(component);
    ReactDOM.render(
        <Provider store={app.store}>
            <ErrorBoundary>
                <ConnectedRouter history={app.history}>
                    <WithRouterComponent />
                </ConnectedRouter>
            </ErrorBoundary>
        </Provider>,
        document.getElementById(container)
    );
    console.timeEnd("[framework] initialized");
}

function devtools(enhancer: StoreEnhancer): StoreEnhancer {
    const production = process.env.NODE_ENV === "production";
    if (!production) {
        const extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        if (extension) {
            return compose(
                enhancer,
                extension({})
            );
        }
    }
    return enhancer;
}

function errorMiddleware(): Middleware<{}, State, Dispatch<Action<any>>> {
    return (store: MiddlewareAPI<Dispatch<Action<any>>, State>) => (next: Dispatch<Action<any>>) => (action: Action<any>): Action<any> => {
        try {
            return next(action);
        } catch (error) {
            console.error(error);
            return next(errorAction(error));
        }
    };
}

function* saga(sagaActionTypes: string[], effects: HandlerMap, store: Store<State>): SagaIterator {
    yield takeEvery(sagaActionTypes, function*(action: Action<any>) {
        const handlers = effects.get(action.type);
        if (handlers) {
            const rootState = store.getState();
            for (const namespace of Object.keys(handlers)) {
                const handler = handlers[namespace];
                yield call(run, handler, action.payload, rootState.app[namespace], rootState);
            }
        }
    });
}

function createRootReducer(reducers: HandlerMap): Reducer<State, Action<any>> {
    return (rootState: State = initialState, action: Action<any>): State => {
        const nextState: State = initialState;

        if (action.type === LOADING_ACTION_TYPE) {
            nextState.loading = loadingReducer(rootState.loading, action);
            return nextState;
        }

        if (action.type === INIT_STATE_ACTION_TYPE) {
            nextState.app = initStateReducer(rootState.app, action);
            return nextState;
        }

        const handlers = reducers.get(action.type);
        if (handlers) {
            const previousAppState = rootState.app;
            const nextAppState = {...previousAppState};
            for (const namespace of Object.keys(handlers)) {
                const handler = handlers[namespace];
                nextAppState[namespace] = handler(action.payload, previousAppState[namespace], rootState);
            }
            nextState.app = nextAppState;
            return nextState; // with our current design if action type is defined in handler, the state will always change
        }

        return rootState;
    };
}

function createApp(): App {
    console.info("[framework] initialize");

    const namespaces = new Set<string>();
    const reducers = new HandlerMap();
    const sagaActionTypes = [LOCATION_CHANGE, ERROR_ACTION_TYPE]; // actionTypes are shared by multiple modules
    const effects = new HandlerMap();

    const history = createHistory();
    const sagaMiddleware = createSagaMiddleware();

    const rootReducer = createRootReducer(reducers);
    const store = createStore(connectRouter(history)(rootReducer), devtools(applyMiddleware(errorMiddleware(), routerMiddleware(history), sagaMiddleware)));
    sagaMiddleware.run(saga, sagaActionTypes, effects, store);

    window.onerror = (message: string, source?: string, line?: number, column?: number, error?: Error): void => {
        store.dispatch(errorAction(error)); // TODO: error can be null, think about how to handle all cases
    };

    return {history, store, namespaces, reducers, sagaActionTypes, effects, sagaMiddleware};
}

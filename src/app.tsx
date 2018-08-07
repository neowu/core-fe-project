import {ConnectedRouter, connectRouter, routerMiddleware} from "connected-react-router";
import createHistory from "history/createBrowserHistory";
import React, {ComponentType, ReactElement} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router-dom";
import {applyMiddleware, compose, createStore, Dispatch, Middleware, MiddlewareAPI, Reducer, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaIterator} from "redux-saga";
import {call, takeEvery} from "redux-saga/effects";
import {errorAction} from "./action/exception";
import {Handler, handlerListener, run} from "./action/handler";
import {INIT_STATE_ACTION_TYPE, initStateReducer} from "./action/init";
import {LOADING_ACTION_TYPE, loadingReducer} from "./action/loading";
import {registerHandler} from "./action/register";
import {HandlerStore, ReducerHandler} from "./action/store";
import {ErrorBoundary} from "./component/ErrorBoundary";
import {initialState, State} from "./state";
import {Action, App} from "./type";

console.time("[framework] initialized");
const app = createApp();

export function render(component: ComponentType<any>): void {
    renderWithStartup(component, null);
}

export function renderWithStartup(component: ComponentType<any>, startupComponent: ReactElement<any> | null): void {
    const rootElement: HTMLDivElement = document.createElement("div");
    rootElement.id = "framework-app-root";
    document.body.appendChild(rootElement);

    if (startupComponent) {
        const startupElement: HTMLDivElement = document.createElement("div");
        startupElement.id = "framework-startup-overlay";
        startupElement.style.position = "fixed";
        startupElement.style.top = "0";
        startupElement.style.left = "0";
        startupElement.style.backgroundColor = "#fff";
        startupElement.style.width = "100%";
        startupElement.style.height = "100%";
        startupElement.style.zIndex = "9999";
        document.body.appendChild(startupElement);

        ReactDOM.render(startupComponent, startupElement);
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
        rootElement
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

function errorMiddleware(): Middleware<{}, State, Dispatch<any>> {
    return (store: MiddlewareAPI<Dispatch<any>, State>) => (next: Dispatch<Action<any>>) => (action: Action<any>): Action<any> => {
        try {
            return next(action);
        } catch (error) {
            return next(errorAction(error));
        }
    };
}

function* saga(handlers: HandlerStore): SagaIterator {
    yield takeEvery("*", function*(action: Action<any>) {
        const listeners = handlers.listenerEffects[action.type];
        if (listeners) {
            for (const listener of listeners) {
                yield call(run, listener, action.payload);
            }
            return;
        }
        const handler = handlers.effects[action.type];
        if (handler) {
            yield call(run, handler, action.payload);
        }
    });
}

function rootReducer(reducers: {[actionType: string]: ReducerHandler<any>}): Reducer<State, Action<any>> {
    return (state: State = initialState, action: Action<any>): State => {
        const nextState: State = {...state};

        if (action.type === LOADING_ACTION_TYPE) {
            nextState.loading = loadingReducer(nextState.loading, action);
            return nextState;
        }

        if (action.type === INIT_STATE_ACTION_TYPE) {
            nextState.app = initStateReducer(nextState.app, action);
            return nextState;
        }

        const handler = reducers[action.type];
        if (handler) {
            const nextAppState = {...nextState.app};
            nextAppState[handler.namespace!] = handler(...action.payload);
            nextState.app = nextAppState;
            return nextState; // with our current design if action type is defined in handler, the state will always change
        }

        return state;
    };
}

function createApp(): App {
    console.info("[framework] initialize");

    const history = createHistory();
    const handlers = new HandlerStore();
    const sagaMiddleware = createSagaMiddleware();
    const reducer: Reducer<State, Action<any>> = connectRouter(history)(rootReducer(handlers.reducers) as Reducer<State>);
    const store: Store<State, Action<any>> = createStore(reducer, devtools(applyMiddleware(errorMiddleware(), routerMiddleware(history), sagaMiddleware)));
    store.subscribe(handlerListener(store));
    sagaMiddleware.run(saga, handlers);
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (!error) {
            error = new Error(message.toString());
        }
        store.dispatch(errorAction(error));
        return true;
    };
    return {history, store, sagaMiddleware, handlers, namespaces: new Set<string>()};
}

export function register(handler: Handler<any>): void {
    if (app.namespaces.has(handler.namespace)) {
        throw new Error(`namespace is already registered, namespace=${handler.namespace}`);
    }
    app.namespaces.add(handler.namespace);
    return registerHandler(handler, app);
}

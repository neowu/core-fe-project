import {ConnectedRouter, connectRouter, routerMiddleware} from "connected-react-router";
import createHistory from "history/createBrowserHistory";
import React, {ComponentType, ReactElement} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router-dom";
import {applyMiddleware, compose, createStore, Dispatch, Middleware, MiddlewareAPI, Reducer, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaIterator} from "redux-saga";
import {call, takeEvery} from "redux-saga/effects";
import {errorAction} from "./action/error";
import {Handler, storeListener, run} from "./action/handler";
import {rootReducer} from "./action/reducer";
import {registerHandler} from "./action/register";
import {ErrorBoundary} from "./component/ErrorBoundary";
import {State} from "./state";
import {Action, App, Handlers} from "./type";

console.time("[framework] initialized");
const app = createApp();

export function render(component: ComponentType<any>, startupComponent: ReactElement<any> | null = null): void {
    const rootElement: HTMLDivElement = document.createElement("div");
    rootElement.id = "framework-app-root";
    document.body.appendChild(rootElement);

    const renderApp = () => {
        const WithRouterComponent = withRouter(component);
        ReactDOM.render(
            <Provider store={app.store}>
                <ErrorBoundary>
                    <ConnectedRouter history={app.history}>
                        <WithRouterComponent />
                    </ConnectedRouter>
                </ErrorBoundary>
            </Provider>,
            rootElement,
            () => console.timeEnd("[framework] initialized") // Initialization usually takes around 120-150ms
        );
    };

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

        ReactDOM.render(startupComponent, startupElement, renderApp);
    } else {
        renderApp();
    }
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

function* saga(handlers: Handlers): SagaIterator {
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

function createApp(): App {
    console.info("[framework] initialize");

    const history = createHistory();
    const handlers = new Handlers();
    const sagaMiddleware = createSagaMiddleware();
    const reducer: Reducer<State> = connectRouter(history)(rootReducer());
    const store: Store<State> = createStore(reducer, devtools(applyMiddleware(routerMiddleware(history), sagaMiddleware)));
    store.subscribe(storeListener(store));
    sagaMiddleware.run(saga, handlers);
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (!error) {
            error = new Error(message.toString());
        }
        store.dispatch(errorAction(error));
        return true;
    };
    return {history, store, sagaMiddleware, handlers, modules: {}};
}

export function register(handler: Handler<any>): void {
    if (app.modules.hasOwnProperty(handler.module)) {
        throw new Error(`module is already registered, module=${handler.module}`);
    }

    app.modules[handler.module] = false;
    return registerHandler(handler, app);
}

import {ConnectedRouter, connectRouter, routerMiddleware} from "connected-react-router";
import {createBrowserHistory} from "history";
import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router-dom";
import {applyMiddleware, createStore, Store} from "redux";
import createSagaMiddleware, {SagaIterator} from "redux-saga";
import {call, takeEvery} from "redux-saga/effects";
import {actionCreator, ActionCreators} from "./action/creator";
import {errorAction} from "./action/error";
import {Handler, Handlers, run, storeListener} from "./action/handler";
import {createRootReducer} from "./action/reducer";
import {registerHandler} from "./action/register";
import {ErrorBoundary} from "./component/ErrorBoundary";
import {composeWithDevTools} from "./devtools";
import {completeInitialization, registerUserDefinedInitializationCallback} from "./initialization";
import {State} from "./state";
import {Action, App} from "./type";

console.time("[framework] Initial Module Logic");
const app = createApp();

export function render(component: ComponentType<any>, onInitialized: null | (() => void) = null): void {
    console.time("[framework] Initial UI Render");

    const rootElement: HTMLDivElement = document.createElement("div");
    rootElement.style.transition = "all 150ms ease-in 100ms";
    rootElement.style.opacity = "0";
    rootElement.style.transform = "translateY(-10px) scale(0.98)";
    rootElement.id = "framework-app-root";
    document.body.appendChild(rootElement);
    registerUserDefinedInitializationCallback(onInitialized);

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
        () => completeInitialization(true)
    );
}

function* saga(handlers: Handlers): SagaIterator {
    yield takeEvery("*", function*(action: Action<any>) {
        const listeners = handlers.listeners[action.type];
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
    const history = createBrowserHistory();
    const handlers = new Handlers();
    const sagaMiddleware = createSagaMiddleware();
    const store: Store<State> = createStore(createRootReducer(connectRouter(history)), composeWithDevTools(applyMiddleware(routerMiddleware(history), sagaMiddleware)));
    store.subscribe(storeListener(store));
    sagaMiddleware.run(saga, handlers);
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (process.env.NODE_ENV === "development") {
            console.error("window global error");
            if (error) {
                console.error(error);
            }
            console.error(`message: ${message.toString()}`);
            if (source && line && column) {
                console.error(`source: ${source} (${line}, ${column})`);
            }
        }

        if (!error) {
            error = new Error(message.toString());
        }
        store.dispatch(errorAction(error));
        return true;
    };
    return {history, store, sagaMiddleware, handlers, modules: {}};
}

export function register<H extends Handler<any>>(handler: H): ActionCreators<H> {
    if (app.modules.hasOwnProperty(handler.module)) {
        throw new Error(`module is already registered, module=${handler.module}`);
    }

    app.modules[handler.module] = false;
    registerHandler(handler, app);

    return actionCreator(handler);
}

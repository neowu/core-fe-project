import {ConnectedRouter, connectRouter, routerMiddleware} from "connected-react-router";
import {History} from "history";
import createHistory from "history/createBrowserHistory";
import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router-dom";
import {
    applyMiddleware,
    compose,
    createStore,
    Dispatch,
    Middleware,
    MiddlewareAPI,
    Reducer,
    Store,
    StoreEnhancer
} from "redux";
import createSagaMiddleware, {SagaIterator, SagaMiddleware} from "redux-saga";
import {call, takeEvery} from "redux-saga/effects";
import {run} from "./action/function";
import {Action, ActionStore} from "./action/index";
import {INIT_STATE_ACTION_TYPE, initStateReducer} from "./action/init";
import {LOADING_ACTION_TYPE, loadingReducer} from "./action/loading";
import {ErrorBoundary} from "./component/ErrorBoundary";
import {errorAction} from "./exception";
import {initialState, State} from "./state";

interface App {
    readonly store: Store<State, Action<any>>;
    readonly history: History;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly actions: ActionStore; // This stores all effects, reducers, and their contexts.
}

console.time("[framework] initialized");
export const app = createApp();

export function render(component: ComponentType<any>, container: string): void {
    if (!component) {
        throw new Error("component must not be null");
    }
    const WithRouterComponent = withRouter(component);
    ReactDOM.render(
        <Provider store={app.store as any}>
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

function errorMiddleware(): Middleware<{}, State, Dispatch<any>> {
    return (store: MiddlewareAPI<Dispatch<any>, State>) => (next: Dispatch<Action<any>>) => (action: Action<any>): Action<any> => {
        try {
            return next(action);
        } catch (error) {
            return next(errorAction(error));
        }
    };
}

function* saga(actions: ActionStore, store: Store<State, Action<any>>): SagaIterator {
    yield takeEvery("*", function*(action: Action<any>) {
        const effectFunctions = actions.getEffects(action.type);
        if (effectFunctions) {
            for (const namespace of Object.keys(effectFunctions)) {
                const handler = effectFunctions[namespace];

                yield call(run, handler, action.payload);
            }
        }
    });
}

function createRootReducer(actions: ActionStore): Reducer<State, Action<any>> {
    return (rootState: State = initialState, action: Action<any>): State => {
        const nextState: State = initialState;
        const previousAppState = rootState.app;

        if (action.type === LOADING_ACTION_TYPE) {
            nextState.loading = loadingReducer(rootState.loading, action);
            return nextState;
        }

        if (action.type === INIT_STATE_ACTION_TYPE) {
            nextState.app = initStateReducer(rootState.app, action);
            return nextState;
        }

        const reducerFunctions = actions.getReducers(action.type);
        if (reducerFunctions) {
            const nextAppState = {...previousAppState};
            for (const namespace of Object.keys(reducerFunctions)) {
                const reducerFunction = reducerFunctions[namespace];
                const updatedState = reducerFunction(...action.payload); // Spread payload array
                // Use "as any" to remove readonly here
                (actions.contextObjects[namespace] as any).state = updatedState;
                nextAppState[namespace] = updatedState;
            }
            nextState.app = nextAppState;
            return nextState; // with our current design if action type is defined in handler, the state will always change
        }

        return rootState;
    };
}

function createApp(): App {
    console.info("[framework] initialize");

    const actions = new ActionStore();
    const history = createHistory();
    const sagaMiddleware = createSagaMiddleware();

    const rootReducer = createRootReducer(actions);
    const reducer: Reducer<State, Action<any>> = connectRouter(history)(rootReducer as Reducer<State>);
    const store = createStore(reducer, devtools(applyMiddleware(errorMiddleware(), routerMiddleware(history), sagaMiddleware)));
    sagaMiddleware.run(saga, actions, store);

    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (!error) {
            error = new Error(message.toString());
        }
        store.dispatch(errorAction(error));
        return true;
    };

    return {history, store, actions, sagaMiddleware};
}

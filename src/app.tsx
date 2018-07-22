import {ConnectedRouter, connectRouter, LOCATION_CHANGE, routerMiddleware} from "connected-react-router";
import createHistory from "history/createBrowserHistory";
import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router-dom";
import {applyMiddleware, compose, createStore, Dispatch, Middleware, MiddlewareAPI, Reducer, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaIterator} from "redux-saga";
import {call, takeEvery} from "redux-saga/effects";
import {Handler, handlerListener, run} from "./action/handler";
import {INIT_STATE_ACTION_TYPE, initStateReducer} from "./action/init";
import {LOADING_ACTION_TYPE, loadingReducer} from "./action/loading";
import {registerHandler} from "./action/register";
import {ErrorBoundary} from "./component/ErrorBoundary";
import {ERROR_ACTION_TYPE, errorAction} from "./exception";
import {initialState} from "./state";
import {Action, App, EffectHandler, ErrorHandler, LocationChangeHandler, ReducerHandler, State} from "./type";

console.time("[framework] initialized");
const app = createApp();

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

function errorMiddleware(): Middleware<{}, State, Dispatch<any>> {
    return (store: MiddlewareAPI<Dispatch<any>, State>) => (next: Dispatch<Action<any>>) => (action: Action<any>): Action<any> => {
        try {
            return next(action);
        } catch (error) {
            return next(errorAction(error));
        }
    };
}

function* saga(effects: {[actionType: string]: EffectHandler}, onErrorEffects: ErrorHandler[], onLocationChangeEffects: LocationChangeHandler[]): SagaIterator {
    yield takeEvery("*", function*(action: Action<any>) {
        switch (action.type) {
            case LOCATION_CHANGE:
                for (const handler of onLocationChangeEffects) {
                    yield call(run, handler, action.payload);
                }
                break;
            case ERROR_ACTION_TYPE:
                for (const handler of onErrorEffects) {
                    yield call(run, handler, action.payload);
                }
                break;
            default:
                const handler = effects[action.type];
                if (handler) {
                    yield call(run, handler, action.payload);
                }
        }
    });
}

function createRootReducer(reducers: {[actionType: string]: ReducerHandler<any>}): Reducer<State, Action<any>> {
    return (rootState: State = initialState, action: Action<any>): State => {
        const nextState: State = {...rootState};

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

        return rootState;
    };
}

function createApp(): App {
    console.info("[framework] initialize");

    const history = createHistory();
    const reducers: {[actionType: string]: ReducerHandler<any>} = {};
    const effects = {};
    const onErrorEffects: ErrorHandler[] = [];
    const onLocationChangeEffects: LocationChangeHandler[] = [];

    const sagaMiddleware = createSagaMiddleware();
    const reducer: Reducer<State, Action<any>> = connectRouter(history)(createRootReducer(reducers) as Reducer<State>);
    const store: Store<State, Action<any>> = createStore(reducer, devtools(applyMiddleware(errorMiddleware(), routerMiddleware(history), sagaMiddleware)));
    store.subscribe(handlerListener(store));
    sagaMiddleware.run(saga, effects, onErrorEffects, onLocationChangeEffects);
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (!error) {
            error = new Error(message.toString());
        }
        store.dispatch(errorAction(error));
        return true;
    };
    return {history, store, sagaMiddleware, reducers, effects, onErrorEffects, onLocationChangeEffects, namespaces: new Set<string>()};
}

export function register(handler: Handler<any>): void {
    return registerHandler(handler, app);
}

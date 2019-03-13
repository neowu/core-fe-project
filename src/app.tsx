import {createBrowserHistory, History} from "history";
import React from "react";
import {applyMiddleware, compose, createStore, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaMiddleware} from "redux-saga";
import {put, takeEvery} from "redux-saga/effects";
import {EventLogger} from "./EventLogger";
import {ActionHandler, ErrorHandler} from "./module";
import {Action, ERROR_ACTION_TYPE, errorAction, LOADING_ACTION, rootReducer, State} from "./reducer";

declare const window: any;

interface App {
    readonly browserHistory: History;
    readonly store: Store<State>;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly actionHandlers: {[actionType: string]: ActionHandler};
    readonly eventLogger: EventLogger;
    errorHandler: ErrorHandler | null;
}

function composeWithDevTools(enhancer: StoreEnhancer): StoreEnhancer {
    let composeEnhancers = compose;
    const production = process.env.NODE_ENV === "production";
    if (!production) {
        const extension = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
        if (extension) {
            composeEnhancers = extension({
                // Ref: https://github.com/zalmoxisus/redux-devtools-extension/blob/master/docs/API/Arguments.md
                actionsBlacklist: [LOADING_ACTION],
            });
        }
    }
    return composeEnhancers(enhancer);
}

function createApp(): App {
    const browserHistory = createBrowserHistory();
    const eventLogger = new EventLogger();
    const sagaMiddleware = createSagaMiddleware();
    const store: Store<State> = createStore(rootReducer(), composeWithDevTools(applyMiddleware(sagaMiddleware)));
    const actionHandlers: {[actionType: string]: ActionHandler} = {};
    sagaMiddleware.run(function* rootSaga() {
        yield takeEvery("*", function*(action: Action<any>) {
            if (action.type === ERROR_ACTION_TYPE) {
                if (app.errorHandler) {
                    yield* app.errorHandler(action.payload);
                }
            } else {
                const handler = app.actionHandlers[action.type];
                if (handler) {
                    try {
                        yield* handler(...action.payload);
                    } catch (error) {
                        yield put(errorAction(error));
                    }
                }
            }
        });
    });
    return {browserHistory, store, sagaMiddleware, actionHandlers, eventLogger, errorHandler: null};
}

export const app = createApp();

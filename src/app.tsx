import React from "react";
import {applyMiddleware, compose, createStore, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaMiddleware} from "redux-saga";
import {EventLogger} from "./EventLogger";
import {ActionHandler, ErrorHandler} from "./handler";
import {LOADING_ACTION, rootReducer, State} from "./reducer";
import {rootSaga} from "./saga";

interface App {
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
        const extension = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
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
    const eventLogger = new EventLogger();
    const sagaMiddleware = createSagaMiddleware();
    const store: Store<State> = createStore(rootReducer(), composeWithDevTools(applyMiddleware(sagaMiddleware)));
    const actionHandlers: {[actionType: string]: ActionHandler} = {};
    sagaMiddleware.run(rootSaga);
    return {store, sagaMiddleware, actionHandlers, eventLogger, errorHandler: null};
}

export const app = createApp();

import {connectRouter, routerMiddleware} from "connected-react-router";
import {createBrowserHistory, History} from "history";
import React from "react";
import {applyMiddleware, createStore, Store} from "redux";
import createSagaMiddleware, {SagaMiddleware} from "redux-saga";
import {ActionHandler, ErrorHandler} from "./module/handler";
import {rootSaga} from "./module/saga";
import {composeWithDevTools} from "./platform/devtools";
import {rootReducer, State} from "./reducer";

interface App {
    readonly store: Store<State>;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly actionHandlers: {[actionType: string]: ActionHandler};
    readonly errorHandlers: ErrorHandler[];
    readonly history: History;
    readonly modules: {[module: string]: boolean}; // whether module is loaded
}

function createApp(): App {
    const history = createBrowserHistory();
    const sagaMiddleware = createSagaMiddleware();
    const store: Store<State> = createStore(rootReducer(connectRouter(history)), composeWithDevTools(applyMiddleware(routerMiddleware(history), sagaMiddleware)));
    const actionHandlers: {[actionType: string]: ActionHandler} = {};
    const errorHandlers: ErrorHandler[] = [];
    sagaMiddleware.run(rootSaga);
    return {store, sagaMiddleware, actionHandlers, errorHandlers, history, modules: {}};
}

export const app = createApp();

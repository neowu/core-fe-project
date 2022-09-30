import {routerMiddleware} from "connected-react-router";
import {createBrowserHistory, History} from "history";
import {applyMiddleware, compose, createStore, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaMiddleware} from "redux-saga";
import {takeEvery, call as rawCall, race as rawRace, take} from "redux-saga/effects";
import {Logger, LoggerConfig, LoggerImpl} from "./Logger";
import {ActionHandler, ErrorHandler, executeAction} from "./module";
import {Action, LOADING_ACTION, rootReducer, State} from "./reducer";
import {captureError} from "./util/error-util";

declare const window: any;

interface App {
    readonly browserHistory: History;
    readonly store: Store<State>;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly actionHandlers: {[actionType: string]: {handler: ActionHandler; moduleName: string}};
    readonly logger: LoggerImpl;
    loggerConfig: LoggerConfig | null;
    errorHandler: ErrorHandler;
}

export const app = createApp();
export const logger: Logger = app.logger;

function composeWithDevTools(enhancer: StoreEnhancer): StoreEnhancer {
    let composeEnhancers = compose;
    if (process.env.NODE_ENV === "development") {
        const extension = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
        if (extension) {
            composeEnhancers = extension({
                // Ref: https://github.com/reduxjs/redux-devtools/blob/main/extension/docs/API/Arguments.md#actionsdenylist--actionsallowlist
                actionsDenylist: [LOADING_ACTION],
            });
        }
    }
    return composeEnhancers(enhancer);
}

function createApp(): App {
    const browserHistory = createBrowserHistory();
    const eventLogger = new LoggerImpl();
    const sagaMiddleware = createSagaMiddleware({
        onError: (error, info) => captureError(error, "@@framework/detached-saga", {extraStacktrace: info.sagaStack}),
    });
    const store: Store<State> = createStore(rootReducer(browserHistory), composeWithDevTools(applyMiddleware(routerMiddleware(browserHistory), sagaMiddleware)));
    sagaMiddleware.run(function* () {
        yield takeEvery("*", function* (action: Action<any>) {
            const actionHandler = app.actionHandlers[action.type];
            if (actionHandler) {
                const {handler, moduleName} = actionHandler;
                // Cancel all saga when related module destroy
                // @see https://stackoverflow.com/a/45806187
                yield rawRace({
                    task: rawCall(executeAction, action.type, handler, ...action.payload),
                    cancel: take(`@@${moduleName}/@@cancel-saga`),
                });
            }
        });
    });

    return {
        browserHistory,
        store,
        sagaMiddleware,
        actionHandlers: {},
        logger: eventLogger,
        loggerConfig: null,
        *errorHandler() {},
    };
}

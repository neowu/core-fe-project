import {createBrowserHistory, type History} from "history";
import {applyMiddleware, compose, legacy_createStore as createStore, type Store, type StoreEnhancer} from "redux";
import {createReduxHistoryContext} from "redux-first-history";
import createSagaMiddleware, {type SagaMiddleware} from "redux-saga";
import {call as rawCall, race as rawRace, take, takeEvery} from "redux-saga/effects";
import {type Logger, type LoggerConfig, LoggerImpl} from "./Logger";
import {type ActionHandler, type ErrorHandler, executeAction} from "./module";
import {type Action, LOADING_ACTION, rootReducer, type State} from "./reducer";
import {captureError} from "./util/error-util";

declare const window: any;

interface App {
    readonly history: History;
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
    const {createReduxHistory, routerMiddleware, routerReducer} = createReduxHistoryContext({
        history: createBrowserHistory(),
    });
    const sagaMiddleware = createSagaMiddleware({
        onError: (error, info) => captureError(error, "@@framework/detached-saga", {extraStacktrace: info.sagaStack}),
    });
    const store: Store<State> = createStore(rootReducer(routerReducer), composeWithDevTools(applyMiddleware(routerMiddleware, sagaMiddleware)));

    // createReduxHistory() will dispatch an action, it must be called before middleware takeEvery(*) takes effect
    const reduxHistory = createReduxHistory(store);

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
        history: reduxHistory,
        store,
        sagaMiddleware,
        actionHandlers: {},
        logger: new LoggerImpl(),
        loggerConfig: null,
        *errorHandler() {},
    };
}

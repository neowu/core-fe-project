import {routerMiddleware} from "connected-react-router";
import {createBrowserHistory, History} from "history";
import {applyMiddleware, compose, createStore, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaMiddleware} from "redux-saga";
import {takeEvery, takeLeading} from "redux-saga/effects";
import {LoggerConfig, LoggerImpl} from "./Logger";
import {ActionHandler, ErrorHandler, executeAction} from "./module";
import {Action, ERROR_ACTION_TYPE, ExceptionPayload, LOADING_ACTION, rootReducer, State} from "./reducer";
import {shouldHandle} from "./platform/exceptionAnalyzer";

declare const window: any;

interface App {
    readonly browserHistory: History;
    readonly store: Store<State>;
    readonly sagaMiddleware: SagaMiddleware<any>;
    readonly actionHandlers: {[actionType: string]: ActionHandler};
    readonly logger: LoggerImpl;
    errorHandler: ErrorHandler | null;
    loggerConfig: LoggerConfig | null;
}

function composeWithDevTools(enhancer: StoreEnhancer): StoreEnhancer {
    let composeEnhancers = compose;
    if (process.env.NODE_ENV !== "production") {
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
    const eventLogger = new LoggerImpl();
    const sagaMiddleware = createSagaMiddleware();
    const store: Store<State> = createStore(rootReducer(browserHistory), composeWithDevTools(applyMiddleware(routerMiddleware(browserHistory), sagaMiddleware)));

    /**
     * Spawns two root sagas:
     * One for handling module actions (non-block, handle all).
     * One for handling errors (blocked, handle only one at one time).
     */
    sagaMiddleware.run(function*() {
        yield takeEvery("*", function*(action: Action<any>) {
            const handler = app.actionHandlers[action.type];
            if (handler) {
                yield* executeAction(handler, ...action.payload);
            }
        });
    });
    sagaMiddleware.run(function*() {
        yield takeLeading(ERROR_ACTION_TYPE, function*(action: Action<any>) {
            const errorAction = action as Action<ExceptionPayload>;
            if (shouldHandle(errorAction.payload)) {
                app.logger.exception(errorAction.payload.exception, errorAction.payload.actionName);
                if (app.errorHandler) {
                    try {
                        yield* app.errorHandler(errorAction.payload.exception);
                    } catch (e) {
                        console.error("Error Caught In Error Handler");
                        console.error(e);
                    }
                }
            } else {
                app.logger.warn({
                    action: errorAction.payload.actionName || "-",
                    errorCode: "EXTERNAL_WARN",
                    errorMessage: errorAction.payload.exception.message,
                    info: {errorObject: JSON.stringify(errorAction.payload.exception)},
                    elapsedTime: 0,
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
        errorHandler: null,
        loggerConfig: null,
    };
}

export const app = createApp();

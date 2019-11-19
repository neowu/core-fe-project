import {routerMiddleware} from "connected-react-router";
import {createBrowserHistory, History} from "history";
import {applyMiddleware, compose, createStore, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaMiddleware} from "redux-saga";
import {takeEvery} from "redux-saga/effects";
import {LoggerConfig, LoggerImpl} from "./Logger";
import {ActionHandler, ErrorHandler, executeAction} from "./module";
import {Action, ERROR_ACTION_TYPE, ExceptionPayload, LOADING_ACTION, rootReducer, State} from "./reducer";
import {shouldAlertToUser} from "./util/error-util";

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
        let isHandlingError = false;
        yield takeEvery("*", function*(action: Action<any>) {
            if (action.type === ERROR_ACTION_TYPE) {
                /**
                 * CAVEAT:
                 * Do not use takeLeading to handle error.
                 * Otherwise, only one error will be logged.
                 * Expected behavior is: Log every error, but execute one errorHandler at one time
                 */
                const errorAction = action as Action<ExceptionPayload>;
                if (shouldAlertToUser(errorAction.payload)) {
                    app.logger.exception(errorAction.payload.exception, errorAction.payload.actionName, {userReceived: isHandlingError ? "Skipped (Last handler not finished)" : "Received"});
                    if (app.errorHandler && !isHandlingError) {
                        try {
                            isHandlingError = true;
                            yield* app.errorHandler(errorAction.payload.exception);
                        } catch (e) {
                            console.error("Error Caught In Error Handler");
                            console.error(e);
                        } finally {
                            isHandlingError = false;
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
            } else {
                const handler = app.actionHandlers[action.type];
                if (handler) {
                    yield* executeAction(action.type, handler, ...action.payload);
                }
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

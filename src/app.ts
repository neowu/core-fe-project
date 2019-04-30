import {routerMiddleware} from "connected-react-router";
import {createBrowserHistory, History} from "history";
import {applyMiddleware, compose, createStore, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaMiddleware} from "redux-saga";
import {put, takeEvery} from "redux-saga/effects";
import {Exception} from "./Exception";
import {LoggerConfig, LoggerImpl} from "./Logger";
import {ActionHandler, ErrorHandler} from "./module";
import {Action, ERROR_ACTION_TYPE, errorAction, LOADING_ACTION, rootReducer, State} from "./reducer";

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
    sagaMiddleware.run(function*() {
        yield takeEvery("*", function*(action: Action<any>) {
            if (action.type === ERROR_ACTION_TYPE) {
                if (app.errorHandler) {
                    const errorAction = action as Action<Exception>;
                    app.logger.exception(errorAction.payload);
                    yield* app.errorHandler(errorAction.payload);
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

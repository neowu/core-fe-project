import {ConnectedRouter} from "connected-react-router";
import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router";
import {call, delay} from "redux-saga/effects";
import {app} from "../app";
import {setInitializationCallback} from "../initialization";
import {LoggerConfig} from "../Logger";
import {ErrorListener} from "../module";
import {errorAction} from "../reducer";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {ajax} from "../util/network";

interface BootstrapOption {
    componentType: ComponentType<{}>;
    errorListener: ErrorListener;
    onInitialized?: () => void;
    logger?: LoggerConfig;
}

export function startApp(config: BootstrapOption): void {
    setInitializationCallback(() => {
        const rootElement = document.getElementById("framework-app-root")!;
        rootElement.style.transform = "none";
        rootElement.style.opacity = "1";
        if (config.onInitialized) {
            config.onInitialized();
        }
    });
    setupGlobalErrorHandler(config.errorListener);
    setupLogger(config.logger);
    renderDOM(config.componentType, config.onInitialized);
}

function renderDOM(EntryComponent: ComponentType<any>, onInitialized: () => void = () => {}) {
    const rootElement: HTMLDivElement = document.createElement("div");
    rootElement.style.transition = "all 150ms ease-in 100ms";
    rootElement.style.opacity = "0";
    rootElement.style.transform = "translateY(-10px) scale(0.96)";
    rootElement.id = "framework-app-root";
    document.body.appendChild(rootElement);

    const RoutedEntryComponent = withRouter(EntryComponent);
    ReactDOM.render(
        <Provider store={app.store}>
            <ErrorBoundary>
                <ConnectedRouter history={app.browserHistory}>
                    <RoutedEntryComponent />
                </ConnectedRouter>
            </ErrorBoundary>
        </Provider>,
        rootElement
    );
}

function setupGlobalErrorHandler(errorListener: ErrorListener) {
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (!error) {
            error = new Error(message.toString());
        }
        app.store.dispatch(errorAction(error));
        return true;
    };

    app.errorHandler = errorListener.onError.bind(errorListener);
}

function setupLogger(config: LoggerConfig | undefined) {
    if (config) {
        app.loggerConfig = config;
        if (process.env.NODE_ENV === "production") {
            app.sagaMiddleware.run(function*() {
                while (true) {
                    yield delay(config.sendingFrequency * 1000);
                    try {
                        const logs = app.logger.collect();
                        if (logs.length > 0) {
                            yield call(ajax, "PUT", config.serverURL, {}, {events: logs});
                            app.logger.empty();
                        }
                    } catch (e) {
                        // Silent if sending error
                    }
                }
            });
        }
    }
}

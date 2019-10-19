import {ConnectedRouter} from "connected-react-router";
import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router";
import {call, delay} from "redux-saga/effects";
import {app} from "../app";
import {NavigationGuard} from "./NavigationGuard";
import {LoggerConfig} from "../Logger";
import {ErrorListener} from "../module";
import {errorAction} from "../reducer";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {ajax} from "../util/network";
import {RuntimeException} from "../Exception";

interface BootstrapOption {
    componentType: React.ComponentType<{}>;
    errorListener: ErrorListener;
    navigationPreventionMessage?: ((isSamePage: boolean) => string) | string;
    logger?: LoggerConfig;
}

export function startApp(config: BootstrapOption): void {
    setupGlobalErrorHandler(config.errorListener);
    setupLogger(config.logger);
    renderDOM(config.componentType, config.navigationPreventionMessage || "Are you sure to leave current page?");
}

function renderDOM(EntryComponent: React.ComponentType<{}>, navigationPreventionMessage: ((isSamePage: boolean) => string) | string) {
    const rootElement: HTMLDivElement = document.createElement("div");
    rootElement.style.transition = "all 150ms ease-in 100ms";
    rootElement.style.opacity = "0";
    rootElement.style.transform = "translateY(-10px) scale(0.96)";
    rootElement.id = "framework-app-root";
    document.body.appendChild(rootElement);

    const RoutedEntryComponent = withRouter(EntryComponent as any);
    ReactDOM.render(
        <Provider store={app.store}>
            <ErrorBoundary>
                <ConnectedRouter history={app.browserHistory}>
                    <NavigationGuard message={navigationPreventionMessage} />
                    <RoutedEntryComponent />
                </ConnectedRouter>
            </ErrorBoundary>
        </Provider>,
        rootElement,
        () => {
            const rootElement = document.getElementById("framework-app-root")!;
            rootElement.style.transform = "none";
            rootElement.style.opacity = "1";
        }
    );
}

function setupGlobalErrorHandler(errorListener: ErrorListener) {
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        const fullMessage = `Message: ${typeof message === "string" ? message : JSON.stringify(message)}\nSource: ${source || "-"}\nLine: ${line || "-"}\nColumn: ${column || "-"}`;
        if (process.env.NODE_ENV === "development") {
            console.error("Window Global Error", error, fullMessage);
        }
        app.store.dispatch(errorAction(new RuntimeException(fullMessage, error)));
        return true;
    };
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
        if (process.env.NODE_ENV === "development") {
            console.error("Unhandled Promise Rejection", event);
        }
        app.store.dispatch(errorAction(new Error("Unhandled Promise Rejection: " + JSON.stringify(event.reason))));
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

            window.addEventListener(
                "unload",
                () => {
                    try {
                        app.logger.info("@@EXIT", {});
                        const logs = app.logger.collect();
                        /**
                         * Using Blob, instead of simple string.
                         * Because simple string will generate content-type: text/plain.
                         */
                        const blob = new Blob([JSON.stringify({events: logs})], {type: "application/json"});
                        navigator.sendBeacon(config.serverURL, blob); // As HTTP POST request
                    } catch (e) {
                        // Silent if sending error
                    }
                },
                false
            );
        }
    }

    app.logger.info("@@ENTER", {});
}

import {ConnectedRouter} from "connected-react-router";
import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {call, delay} from "redux-saga/effects";
import {app} from "../app";
import {NavigationGuard} from "./NavigationGuard";
import {LoggerConfig} from "../Logger";
import {ErrorListener} from "../module";
import ErrorBoundary from "../util/ErrorBoundary";
import {ajax} from "../util/network";
import {Exception, JavaScriptException, NetworkConnectionException} from "../Exception";
import {isIEBrowser} from "../util/navigator-util";
import {captureError} from "../util/error-util";

interface BootstrapOption {
    componentType: React.ComponentType<{}>;
    errorListener: ErrorListener;
    navigationPreventionMessage?: ((isSamePage: boolean) => string) | string;
    ieBrowserAlertMessage?: string;
    logger?: LoggerConfig;
}

export function startApp(option: BootstrapOption): void {
    detectIEBrowser(option.ieBrowserAlertMessage);
    setupGlobalErrorHandler(option.errorListener);
    setupLogger(option.logger);
    renderDOM(option.componentType, option.navigationPreventionMessage || "Are you sure to leave current page?");
}

function detectIEBrowser(ieBrowserMessage?: string) {
    if (ieBrowserMessage && isIEBrowser()) {
        alert(ieBrowserMessage);
        // After alert, still run the following code, just let whatever error happens
    }
}

function setupGlobalErrorHandler(errorListener: ErrorListener) {
    app.errorHandler = errorListener.onError.bind(errorListener);
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error) => captureError(error || (typeof message === "string" ? new JavaScriptException(message) : message), "@@framework/global");
    window.onunhandledrejection = (event: PromiseRejectionEvent) => captureError(event.reason, "@@framework/promise-rejection");
}

function renderDOM(EntryComponent: React.ComponentType<{}>, navigationPreventionMessage: ((isSamePage: boolean) => string) | string) {
    const rootElement: HTMLDivElement = document.createElement("div");
    rootElement.style.transition = "all 150ms ease-in 100ms";
    rootElement.style.opacity = "0";
    rootElement.style.transform = "translateY(-10px) scale(0.96)";
    rootElement.id = "framework-app-root";
    document.body.appendChild(rootElement);

    ReactDOM.render(
        <Provider store={app.store}>
            <ConnectedRouter history={app.browserHistory}>
                <NavigationGuard message={navigationPreventionMessage} />
                <ErrorBoundary>
                    <EntryComponent />
                </ErrorBoundary>
            </ConnectedRouter>
        </Provider>,
        rootElement,
        () => {
            const rootElement = document.getElementById("framework-app-root")!;
            rootElement.style.transform = "none";
            rootElement.style.opacity = "1";
        }
    );
}

function setupLogger(config: LoggerConfig | undefined) {
    app.logger.info("@@ENTER", {});

    if (config) {
        app.loggerConfig = config;
        app.sagaMiddleware.run(function* () {
            while (true) {
                yield delay(config.sendingFrequency * 1000);
                try {
                    const logs = app.logger.collect();
                    if (logs.length > 0) {
                        yield call(ajax, "POST", config.serverURL, {}, {events: logs});
                        app.logger.empty();
                    }
                } catch (e) {
                    if (e instanceof NetworkConnectionException) {
                        // Log this case and retry later
                        app.logger.exception(e, {}, "@@framework/logger");
                    } else if (e instanceof Exception) {
                        // If not network error, retry always leads to same error, so have to give up
                        const length = app.logger.collect().length;
                        app.logger.empty();
                        app.logger.exception(e, {droppedLogs: length.toString()}, "@@framework/logger");
                    }
                }
            }
        });

        const isIOS = /iPad|iPhone|iPod/.test(navigator.platform);
        window.addEventListener(
            // Ref: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW5
            isIOS ? "pagehide" : "unload",
            () => {
                try {
                    app.logger.info("@@EXIT", {});
                    const logs = app.logger.collect();
                    /**
                     * navigator.sendBeacon() uses HTTP POST, but does not support CORS.
                     * We have to use text/plain as content type, instead of JSON.
                     */
                    const textData = JSON.stringify({events: logs});
                    navigator.sendBeacon(config.serverURL, textData);
                } catch (e) {
                    // Silent if sending error
                }
            },
            false
        );
    }
}

import {ConnectedRouter} from "connected-react-router";
import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {app} from "../app";
import {NavigationGuard} from "./NavigationGuard";
import {LoggerConfig} from "../Logger";
import {ErrorListener, executeAction} from "../module";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {ajax} from "../util/network";
import {Exception, JavaScriptException, NetworkConnectionException} from "../Exception";
import {isIEBrowser} from "../util/navigator-util";
import {captureError, errorToException} from "../util/error-util";
import {SagaIterator, call, delay} from "../typed-saga";

interface UpdateReminderConfig {
    updateCheckURL: string; // Must be GET Method, returning JSON
    thresholdHours: number;
    onRemind: () => SagaIterator;
}

interface BootstrapOption {
    componentType: React.ComponentType;
    errorListener: ErrorListener;
    navigationPreventionMessage?: ((isSamePage: boolean) => string) | string;
    ieBrowserAlertMessage?: string;
    logger?: LoggerConfig;
    updateReminder?: UpdateReminderConfig;
}

const LOGGER_ACTION = "@@framework/logger";
const UPDATE_REMINDER_ACTION = "@@framework/update-reminder";

export function startApp(option: BootstrapOption): void {
    detectIEBrowser(option.ieBrowserAlertMessage);
    setupGlobalErrorHandler(option.errorListener);
    setupAppExitListener(option.logger?.serverURL);
    runBackgroundLoop(option.logger, option.updateReminder);
    renderRoot(option.componentType, option.navigationPreventionMessage || "Are you sure to leave current page?");
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

function renderRoot(EntryComponent: React.ComponentType, navigationPreventionMessage: ((isSamePage: boolean) => string) | string) {
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

function setupAppExitListener(eventServerURL?: string) {
    if (eventServerURL) {
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
                    navigator.sendBeacon(eventServerURL, textData);
                } catch (e) {
                    // Silent if sending error
                }
            },
            false
        );
    }
}

function runBackgroundLoop(loggerConfig?: LoggerConfig, updateReminderConfig?: UpdateReminderConfig) {
    app.logger.info("@@ENTER", {});
    app.loggerConfig = loggerConfig || null;
    app.sagaMiddleware.run(function* () {
        let lastChecksumTimestamp = 0;
        let lastChecksum: string | null = null;
        while (true) {
            // Loop on every 20 second
            yield delay(20000);

            // Send collected log to event server
            if (loggerConfig) {
                yield* call(sendEventLogs, loggerConfig);
            }

            // Check if staying too long, then check if need refresh by comparing server-side checksum
            if (updateReminderConfig) {
                const stayingHours = (Date.now() - lastChecksumTimestamp) / 3600 / 1000;
                if (stayingHours > updateReminderConfig.thresholdHours) {
                    const newChecksum = yield* call(fetchAppChecksum, updateReminderConfig.updateCheckURL);
                    if (newChecksum) {
                        if (lastChecksum !== null && newChecksum !== lastChecksum) {
                            app.logger.info(UPDATE_REMINDER_ACTION, {newChecksum, lastChecksum, stayingHours: stayingHours.toFixed(2)});
                            yield* executeAction(UPDATE_REMINDER_ACTION, updateReminderConfig.onRemind);
                        }
                        lastChecksum = newChecksum;
                        lastChecksumTimestamp = Date.now();
                    }
                }
            }
        }
    });
}

async function sendEventLogs(config: LoggerConfig): Promise<void> {
    try {
        const logs = app.logger.collect();
        if (logs.length > 0) {
            /**
             * Event server URL may be different from current domain (supposing abc.com)
             *
             * In order to support this, we must ensure:
             * - Event server allows cross-origin request from current domain
             * - Root-domain cookies, whose domain is set by current domain as ".abc.com", can be sent (withCredentials = true)
             */
            await call(ajax, "POST", config.serverURL, {}, {events: logs}, {withCredentials: true});
            app.logger.empty();
        }
    } catch (e) {
        if (e instanceof NetworkConnectionException) {
            // Log this case and retry later
            app.logger.exception(e, {}, LOGGER_ACTION);
        } else if (e instanceof Exception) {
            // If not network error, retry always leads to same error, so have to give up
            const length = app.logger.collect().length;
            app.logger.empty();
            app.logger.exception(e, {droppedLogs: length.toString()}, LOGGER_ACTION);
        }
    }
}

/**
 * Only call this function if necessary, i.e: initial checksum, or after long-staying check
 * Return latest checksum, or null for failure.
 */
async function fetchAppChecksum(url: string): Promise<string | null> {
    try {
        const startTimestamp = Date.now();
        const response = await ajax("GET", url, {}, null);
        const checksum = JSON.stringify(response);
        app.logger.info(UPDATE_REMINDER_ACTION, {checksum}, Date.now() - startTimestamp);
        return checksum;
    } catch (e) {
        app.logger.exception(errorToException(e), {}, UPDATE_REMINDER_ACTION);
        return null;
    }
}

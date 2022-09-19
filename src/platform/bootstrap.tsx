import {ConnectedRouter} from "connected-react-router";
import {Location} from "history";
import React from "react";
import {createRoot} from "react-dom/client";
import {Provider} from "react-redux";
import {app} from "../app";
import {NavigationGuard} from "./NavigationGuard";
import {LoggerConfig} from "../Logger";
import {ErrorListener, executeAction} from "../module";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {ajax} from "../util/network";
import {APIException} from "../Exception";
import {isIEBrowser} from "../util/navigator-util";
import {captureError, errorToException} from "../util/error-util";
import {SagaGenerator, call, delay} from "../typed-saga";
import {IdleDetector, idleTimeoutActions} from "..";
import {DEFAULT_IDLE_TIMEOUT} from "../util/IdleDetector";
import {SagaIterator} from "redux-saga";
import axios, {AxiosRequestConfig} from "axios";

/**
 * Configuration for frontend version check.
 * If the `versionCheckURL` API response changes, `onRemind` will be executed.
 */
interface VersionCheckConfig {
    onRemind: () => SagaGenerator;
    versionCheckURL: string; // Must be GET Method, returning whatever JSON
    frequencyInSecond?: number; // Default: 600 (10 min)
}

/**
 * Configuration for browser related features.
 * - onIE: Alert to user or redirect when using IE browser, because framework does not support IE.
 * - onLocationChange: A global event handler for any location change events.
 * - navigationPreventionMessage: Only useful if you are leaving some page, whose "setNavigationPrevented" is toggled as true.
 */
interface BrowserConfig {
    onIE?: () => void;
    onLocationChange?: (location: Location) => void;
    navigationPreventionMessage?: string;
}

interface BootstrapOption {
    componentType: React.ComponentType;
    errorListener: ErrorListener;
    rootContainer?: HTMLElement;
    browserConfig?: BrowserConfig;
    loggerConfig?: LoggerConfig;
    versionConfig?: VersionCheckConfig;
    idleTimeoutInSecond?: number; // Default: 5 min, never Idle if non-positive value given
}

export const LOGGER_ACTION = "@@framework/logger";
export const VERSION_CHECK_ACTION = "@@framework/version-check";
export const GLOBAL_ERROR_ACTION = "@@framework/global";
export const GLOBAL_PROMISE_REJECTION_ACTION = "@@framework/promise-rejection";

export function bootstrap(option: BootstrapOption): void {
    detectIEBrowser(option.browserConfig?.onIE);
    setupGlobalErrorHandler(option.errorListener);
    setupAppExitListener(option.loggerConfig?.serverURL);
    setupLocationChangeListener(option.browserConfig?.onLocationChange);
    setupIdleTimeout(option.idleTimeoutInSecond ?? DEFAULT_IDLE_TIMEOUT);
    runBackgroundLoop(option.loggerConfig, option.versionConfig);
    renderRoot(option.componentType, option.rootContainer || injectRootContainer(), option.browserConfig?.navigationPreventionMessage || "Are you sure to leave current page?");
}

function detectIEBrowser(onIE?: () => void) {
    if (isIEBrowser()) {
        if (onIE) {
            onIE();
        } else {
            let ieAlertMessage: string;
            const navigatorLanguage = navigator.languages ? navigator.languages[0] : navigator.language;
            if (navigatorLanguage.startsWith("zh")) {
                ieAlertMessage = "对不起，本网站不支持 IE 浏览器\n请使用 Chrome/Firefox/360 浏览器再访问";
            } else {
                ieAlertMessage = "This website does not support IE browser.\nPlease use Chrome/Safari/Firefox to visit.\nSorry for the inconvenience.";
            }
            alert(ieAlertMessage);
        }
        // After that, the following code may still run
    }
}

function setupGlobalErrorHandler(errorListener: ErrorListener) {
    app.errorHandler = errorListener.onError.bind(errorListener);
    window.addEventListener(
        "error",
        (event) => {
            try {
                const analyzeByTarget = (): string => {
                    if (event.target && event.target !== window) {
                        const element = event.target as HTMLElement;
                        return `DOM source error: ${element.outerHTML}`;
                    }
                    return `Unrecognized error, serialized as ${JSON.stringify(event)}`;
                };
                captureError(event.error || event.message || analyzeByTarget(), GLOBAL_ERROR_ACTION);
            } catch (e) {
                /**
                 * This should not happen normally.
                 * However, global error handler might catch external webpage errors, and fail to parse error due to cross-origin limitations.
                 * A typical example is: Permission denied to access property `foo`
                 */
                app.logger.warn({
                    action: GLOBAL_ERROR_ACTION,
                    errorCode: "ERROR_HANDLER_FAILURE",
                    errorMessage: errorToException(e).message,
                    elapsedTime: 0,
                    info: {},
                });
            }
        },
        true
    );
    window.addEventListener(
        "unhandledrejection",
        (event) => {
            try {
                captureError(event.reason, GLOBAL_PROMISE_REJECTION_ACTION);
            } catch (e) {
                app.logger.warn({
                    action: GLOBAL_PROMISE_REJECTION_ACTION,
                    errorCode: "ERROR_HANDLER_FAILURE",
                    errorMessage: errorToException(e).message,
                    elapsedTime: 0,
                    info: {},
                });
            }
        },
        true
    );
}

function renderRoot(EntryComponent: React.ComponentType, rootContainer: HTMLElement, navigationPreventionMessage: string) {
    const root = createRoot(rootContainer);
    root.render(
        <Provider store={app.store}>
            <IdleDetector>
                {/* @ts-ignore - @types/react removed default props.children in class component, and no children prop in ConnectedRouter */}
                <ConnectedRouter history={app.browserHistory}>
                    <NavigationGuard message={navigationPreventionMessage} />
                    <ErrorBoundary>
                        <EntryComponent />
                    </ErrorBoundary>
                </ConnectedRouter>
            </IdleDetector>
        </Provider>
    );
}

function injectRootContainer(): HTMLElement {
    const rootContainer = document.createElement("div");
    rootContainer.id = "framework-app-root";
    document.body.appendChild(rootContainer);
    return rootContainer;
}

function setupAppExitListener(eventServerURL?: string) {
    if (eventServerURL) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.platform);
        window.addEventListener(
            // Ref: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW5
            isIOS ? "pagehide" : "unload",
            () => {
                try {
                    app.logger.info({action: "@@EXIT"});
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

function setupLocationChangeListener(listener?: (location: Location) => void) {
    if (listener) {
        app.browserHistory.listen(listener);
    }
}

function setupIdleTimeout(timeout: number) {
    app.store.dispatch(idleTimeoutActions(timeout));
}

function runBackgroundLoop(loggerConfig?: LoggerConfig, versionCheckConfig?: VersionCheckConfig) {
    app.logger.info({action: "@@ENTER"});
    app.loggerConfig = loggerConfig || null;

    if (loggerConfig) {
        app.sagaMiddleware.run(function* () {
            while (true) {
                yield delay((loggerConfig.frequencyInSecond || 20) * 1000);
                yield* call(sendEventLogs);
            }
        });
    }

    if (versionCheckConfig) {
        app.sagaMiddleware.run(function* () {
            let lastChecksum: string | null = null;

            while (true) {
                const newChecksum = yield* call(fetchVersionChecksum, versionCheckConfig.versionCheckURL);
                if (newChecksum) {
                    if (lastChecksum !== null && newChecksum !== lastChecksum) {
                        yield* executeAction(VERSION_CHECK_ACTION, versionCheckConfig.onRemind);
                    }
                    lastChecksum = newChecksum;
                }
                yield delay((versionCheckConfig.frequencyInSecond || 600) * 1000);
            }
        });
    }
}

export async function sendEventLogs(): Promise<void> {
    if (app.loggerConfig) {
        const logs = app.logger.collect(200);
        const logLength = logs.length;
        if (logLength > 0) {
            try {
                /**
                 * Event server URL may be different from current domain (supposing abc.com)
                 *
                 * In order to support this, we must ensure:
                 * - Event server allows cross-origin request from current domain
                 * - Root-domain cookies, whose domain is set by current domain as ".abc.com", can be sent (withCredentials = true)
                 */
                await ajax("POST", app.loggerConfig.serverURL, {}, {events: logs}, {withCredentials: true});
                app.logger.emptyLastCollection();
            } catch (e) {
                if (e instanceof APIException) {
                    // For APIException, retry always leads to same error, so have to give up
                    // Do not log network exceptions
                    app.logger.emptyLastCollection();
                    app.logger.exception(e, {dropped_logs: logLength.toString()}, LOGGER_ACTION);
                }
            }
        }
    }
}

/**
 * Only call this function if necessary, i.e: initial checksum, or after long-staying check
 * Return latest checksum, or null for failure.
 */
async function fetchVersionChecksum(url: string): Promise<string | null> {
    const startTime = Date.now();
    try {
        const response = await axios.get(url);
        const checksum = JSON.stringify(response.data);
        app.logger.info({
            action: VERSION_CHECK_ACTION,
            elapsedTime: Date.now() - startTime,
            info: {checksum},
        });
        return checksum;
    } catch (e) {
        app.logger.warn({
            action: VERSION_CHECK_ACTION,
            elapsedTime: Date.now() - startTime,
            errorCode: "VERSION_CHECK_FAILURE",
            errorMessage: errorToException(e).message,
        });
        return null;
    }
}

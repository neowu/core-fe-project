import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router";
import {Router} from "react-router-dom";
import {app} from "../app";
import {ErrorBoundary} from "../ErrorBoundary";
import {ErrorListener} from "../module";
import {errorAction} from "../reducer";
import {browserHistory} from "./browserHistory";
import {Module} from "./Module";

type ErrorHandlerModuleClass = new (name: string, state: {}) => Module<{}> & ErrorListener;

interface BootstrapOption {
    componentType: ComponentType<{}>;
    errorHandlerModule: ErrorHandlerModuleClass;
    onInitialized?: () => void;
    eventLoggerContext?: {[key: string]: string | (() => string)};
}

export function startApp(config: BootstrapOption): void {
    renderDOM(config.componentType, config.onInitialized);
    setupGlobalErrorHandler(config.errorHandlerModule);
    setupEventLoggerContext(config.eventLoggerContext);
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
                <Router history={browserHistory}>
                    <RoutedEntryComponent />
                </Router>
            </ErrorBoundary>
        </Provider>,
        rootElement,
        () => {
            onInitialized();
            setTimeout(() => {
                // To make the rendering effect smooth
                const rootElement = document.getElementById("framework-app-root")!;
                rootElement.style.transform = "none";
                rootElement.style.opacity = "1";
            }, 100);
        }
    );
}

function setupGlobalErrorHandler(ErrorHandlerModule: ErrorHandlerModuleClass) {
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (!error) {
            error = new Error(message.toString());
        }
        app.store.dispatch(errorAction(error));
        return true;
    };

    const errorHandler = new ErrorHandlerModule("error-handler", {});
    app.errorHandler = errorHandler.onError.bind(errorHandler);
}

function setupEventLoggerContext(context: {[key: string]: string | (() => string)} = {}) {
    app.eventLogger.setContext(context);
}

import {ConnectedRouter} from "connected-react-router";
import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {app} from "../app";
import {errorAction} from "../reducer";
import {ErrorBoundary} from "../util/ErrorBoundary";

let initialModuleRenderCompleted = false;
let initialModuleLogicCompleted = false;
let onInitialized: null | (() => void) = null;

interface InitialRenderConfig {
    componentType: ComponentType<{}>;
    onInitialized?: () => void;
}

export function renderApp(config: InitialRenderConfig): void {
    const rootElement: HTMLDivElement = document.createElement("div");
    rootElement.style.transition = "all 150ms ease-in 100ms";
    rootElement.style.opacity = "0";
    rootElement.style.transform = "translateY(-10px) scale(0.98)";
    rootElement.id = "framework-app-root";
    document.body.appendChild(rootElement);

    onInitialized = config.onInitialized || null;

    const AppMainComponent = config.componentType;
    ReactDOM.render(
        <Provider store={app.store}>
            <ErrorBoundary>
                <ConnectedRouter history={app.history}>
                    <AppMainComponent />
                </ConnectedRouter>
            </ErrorBoundary>
        </Provider>,
        rootElement,
        () => completeInitialization(true)
    );

    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (process.env.NODE_ENV === "development") {
            console.error("window global error");
            if (error) {
                console.error(error);
            }
            console.error(`message: ${message.toString()}`);
            if (source && line && column) {
                console.error(`source: ${source} (${line}, ${column})`);
            }
        }

        if (!error) {
            error = new Error(message.toString());
        }
        app.store.dispatch(errorAction(error));
        return true;
    };
}

export function completeInitialization(isRenderCompleted: boolean) {
    if ((!isRenderCompleted && initialModuleLogicCompleted) || (isRenderCompleted && initialModuleRenderCompleted)) {
        return;
    }

    if (isRenderCompleted) {
        initialModuleRenderCompleted = true;
    } else {
        initialModuleLogicCompleted = true;
    }

    if (initialModuleLogicCompleted && initialModuleRenderCompleted) {
        if (onInitialized) {
            onInitialized();
        }
        setTimeout(() => {
            // Separate DOM update into another queue, in case callback execution suspends CSS transition
            const rootElement = document.getElementById("framework-app-root")!;
            rootElement.style.transform = "none";
            rootElement.style.opacity = "1";
        }, 0);
    }
}

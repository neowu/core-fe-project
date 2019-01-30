import React from "react";
import {SagaIterator, Task} from "redux-saga";
import {app} from "../app";
import {Action, setStateAction} from "../reducer";
import {ErrorListener, ModuleHandler, ModuleLifecycleListener} from "./handler";
import {lifecycleSaga} from "./saga";

type ActionCreator<H> = H extends (...args: infer P) => SagaIterator ? ((...args: P) => Action<P>) : never;
type HandlerKeys<H> = {[K in keyof H]: H[K] extends (...args: any[]) => SagaIterator ? K : never}[Exclude<keyof H, keyof ErrorListener>];
type ActionCreators<H> = {readonly [K in HandlerKeys<H>]: ActionCreator<H[K]>};

export function register<P extends {}, H extends ModuleHandler<any>>(handler: H, ModuleEntryComponent: React.ComponentType<P>): {actions: ActionCreators<H>; MainComponent: React.ComponentType<P>} {
    const moduleName = handler.module;
    if (app.modules.hasOwnProperty(moduleName)) {
        throw new Error(`module [${moduleName}] already registered`);
    }

    const keys = getKeys(handler);

    // Check if supports ErrorHandler
    if ("onError" in handler) {
        app.errorHandlers.push(((handler as any) as ErrorListener).onError.bind(handler));
    }

    // Transform every method into ActionCreator
    const actions: any = {};
    keys.forEach(actionType => {
        const method = handler[actionType];
        const qualifiedActionType = `${moduleName}/${actionType}`;
        actions[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
        app.actionHandlers[qualifiedActionType] = method.bind(handler);
    });

    // Use "as any" to get private-readonly initialState
    // InitState (Redux) must be called on registration, otherwise, mapStateToProps in MainComponent will fail
    const lifecycleListener = handler as ModuleLifecycleListener<any>;
    const initialState = (handler as any).initialState;
    app.store.dispatch(setStateAction(moduleName, initialState, `@@${moduleName}/initState(register)`));

    // Hook ModuleLifecycle into entry component
    class MainComponent extends React.PureComponent<P> {
        public static displayName = `Module(${moduleName})`;
        private readonly lifecycleSagaTask: Task;

        constructor(props: P) {
            super(props);
            app.modules[moduleName] = false;
            this.lifecycleSagaTask = app.sagaMiddleware.run(lifecycleSaga, props, lifecycleListener, moduleName);
            console.info(`Module [${moduleName}] entered`);
        }

        componentDidUpdate(prevProps: Readonly<P>) {
            const prevLocation = (prevProps as any).location;
            const currentLocation = (this.props as any).location;
            const currentRouteParams = (this.props as any).match ? (this.props as any).match.params : null;
            if (currentLocation && currentRouteParams && prevLocation !== currentLocation && actions.onEnter) {
                // Only trigger if current component is connected to <Route>
                app.store.dispatch(actions.onEnter(currentRouteParams, currentLocation));
            }
        }

        componentWillUnmount() {
            if (lifecycleListener.onLeave) {
                app.store.dispatch(actions.onLeave());
            }

            if ((handler as any).retainStateOnLeave) {
                console.info(`Module [${moduleName}] exiting ...`);
            } else {
                console.info(`Module [${moduleName}] exiting, cleaning states ...`);
                app.store.dispatch(setStateAction(moduleName, initialState, `@@${moduleName}/resetState(unmount)`));
            }

            this.lifecycleSagaTask.cancel();
        }

        render() {
            return <ModuleEntryComponent {...this.props} />;
        }
    }

    return {actions: actions as ActionCreators<H>, MainComponent};
}

export function getKeys<H extends ModuleHandler<any>>(handler: H) {
    // Do not use Object.keys(Object.getPrototypeOf(handler)), because class methods are not enumerable
    const keys: string[] = [];
    for (const propertyName of Object.getOwnPropertyNames(Object.getPrototypeOf(handler))) {
        if (handler[propertyName] instanceof Function && propertyName !== "constructor") {
            keys.push(propertyName);
        }
    }
    return keys;
}

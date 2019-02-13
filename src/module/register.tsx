import React from "react";
import {SagaIterator, Task} from "redux-saga";
import {app} from "../app";
import {Action, setStateAction} from "../reducer";
import {ErrorListener, Module, ModuleLifecycleListener} from "./handler";
import {lifecycleSaga} from "./saga";

type ActionCreator<H> = H extends (...args: infer P) => SagaIterator ? ((...args: P) => Action<P>) : never;
type HandlerKeys<H> = {[K in keyof H]: H[K] extends (...args: any[]) => SagaIterator ? K : never}[Exclude<keyof H, keyof ModuleLifecycleListener | keyof ErrorListener>];
type ActionCreators<H> = {readonly [K in HandlerKeys<H>]: ActionCreator<H[K]>};

interface AttachLifecycleOption {
    retainStateOnLeave?: boolean;
}

class ModuleProxy<M extends Module<any>> {
    public constructor(private module: M, private actions: ActionCreators<M>) {}

    public getActions(): ActionCreators<M> {
        return this.actions;
    }

    public attachLifecycle<P extends {}>(ComponentType: React.ComponentType<P>, config: AttachLifecycleOption = {}): React.ComponentType<P> {
        const moduleName = this.module.name;
        const initialState = (this.module as any).initialState;
        const lifecycleListener = this.module as ModuleLifecycleListener;
        const actions = this.actions as any;

        return class MainComponent extends React.PureComponent<P> {
            public static displayName = `ModuleBoundary(${moduleName})`;
            private readonly lifecycleSagaTask: Task;

            constructor(props: P) {
                super(props);
                app.modules[moduleName] = false;
                this.lifecycleSagaTask = app.sagaMiddleware.run(lifecycleSaga, props, lifecycleListener, moduleName);
            }

            componentDidUpdate(prevProps: Readonly<P>) {
                const prevLocation = (prevProps as any).location;
                const currentLocation = (this.props as any).location;
                const currentRouteParams = (this.props as any).match ? (this.props as any).match.params : null;
                if (currentLocation && currentRouteParams && prevLocation !== currentLocation && lifecycleListener.onEnter.isLifecycle) {
                    // Only trigger if current component is connected to <Route>
                    app.store.dispatch(actions.onEnter(currentRouteParams, currentLocation));
                }
            }

            componentWillUnmount() {
                if (lifecycleListener.onLeave.isLifecycle) {
                    app.store.dispatch(actions.onLeave());
                }

                if (!config.retainStateOnLeave) {
                    app.store.dispatch(setStateAction(moduleName, initialState, `@@${moduleName}/@@RESET`));
                }

                this.lifecycleSagaTask.cancel();
            }

            render() {
                return <ComponentType {...this.props} />;
            }
        };
    }
}

export function register<M extends Module<any>>(module: M): ModuleProxy<M> {
    const moduleName = module.name;
    if (app.modules.hasOwnProperty(moduleName)) {
        throw new Error(`module [${moduleName}] already registered`);
    }

    const keys = getKeys(module);

    // Check if supports ErrorHandler
    if ("onError" in module) {
        app.errorHandlers.push(((module as any) as ErrorListener).onError.bind(module));
    }

    // Transform every method into ActionCreator
    const actions: any = {};
    keys.forEach(actionType => {
        const method = module[actionType];
        const qualifiedActionType = `${moduleName}/${actionType}`;
        actions[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
        app.actionHandlers[qualifiedActionType] = method.bind(module);
    });

    return new ModuleProxy(module, actions);
}

function getKeys<M extends Module<any>>(module: M) {
    // Do not use Object.keys(Object.getPrototypeOf(module)), because class methods are not enumerable
    const keys: string[] = [];
    for (const propertyName of Object.getOwnPropertyNames(Object.getPrototypeOf(module))) {
        if (module[propertyName] instanceof Function && propertyName !== "constructor") {
            keys.push(propertyName);
        }
    }
    return keys;
}

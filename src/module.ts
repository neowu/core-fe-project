import {SagaIterator} from "redux-saga";
import {app} from "./app";
import {Exception} from "./Exception";
import {Module, ModuleLifecycleListener} from "./platform/Module";
import {ModuleProxy} from "./platform/ModuleProxy";
import {Action} from "./reducer";

export interface LifecycleDecoratorFlag {
    isLifecycle?: boolean;
}

export interface TickIntervalDecoratorFlag {
    tickInterval?: number;
}

export type ActionHandler = (...args: any[]) => SagaIterator;

export type ErrorHandler = (error: Exception) => SagaIterator;

export interface ErrorListener {
    onError: ErrorHandler;
}

type ActionCreator<H> = H extends (...args: infer P) => SagaIterator ? ((...args: P) => Action<P>) : never;
type HandlerKeys<H> = {[K in keyof H]: H[K] extends (...args: any[]) => SagaIterator ? K : never}[Exclude<keyof H, keyof ModuleLifecycleListener | keyof ErrorListener>];
export type ActionCreators<H> = {readonly [K in HandlerKeys<H>]: ActionCreator<H[K]>};

export function register<M extends Module<any>>(module: M): ModuleProxy<M> {
    const moduleName = module.name;
    const keys = getKeys(module);

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

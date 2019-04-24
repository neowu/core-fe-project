import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {app} from "./app";
import {Exception} from "./Exception";
import {Module, ModuleLifecycleListener} from "./platform/Module";
import {ModuleProxy} from "./platform/ModuleProxy";
import {Action, errorAction, setStateAction} from "./reducer";

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
    if (!app.store.getState().app[moduleName]) {
        // To get private property
        const initialState = (module as any).initialState;
        app.store.dispatch(setStateAction(moduleName, initialState, `@@${moduleName}/@@init`));
        console.info(`Module [${moduleName}] registered`);
    }

    // Transform every method into ActionCreator
    const actions: any = {};
    getKeys(module).forEach(actionType => {
        const method = module[actionType];
        // Attach action name, for @Log reflection
        const qualifiedActionType = `${moduleName}/${actionType}`;
        method.actionName = qualifiedActionType;
        actions[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
        app.actionHandlers[qualifiedActionType] = method.bind(module);
    });

    // Execute register action
    const lifecycleListener = module as ModuleLifecycleListener;
    if (lifecycleListener.onRegister.isLifecycle) {
        app.store.dispatch(actions.onRegister());
    }

    return new ModuleProxy(module, actions);
}

export function* executeAction(handler: ActionHandler, ...payload: any[]): SagaIterator {
    try {
        yield* handler(...payload);
    } catch (error) {
        yield put(errorAction(error));
    }
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

import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {app} from "./app";
import {ActionHandler, LifecycleDecoratorFlag, TickIntervalDecoratorFlag} from "./module";
import {ModuleLifecycleListener} from "./platform/Module";
import {loadingAction, State} from "./reducer";
import {stringifyWithMask} from "./util/json";

/**
 * Decorator type declaration, required by TypeScript
 */
type HandlerDecorator = (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<ActionHandler>) => TypedPropertyDescriptor<ActionHandler>;
type LifecycleHandlerDecorator = (target: object, propertyKey: keyof ModuleLifecycleListener, descriptor: TypedPropertyDescriptor<ActionHandler & LifecycleDecoratorFlag>) => TypedPropertyDescriptor<ActionHandler>;
type OnTickHandlerDecorator = (target: object, propertyKey: "onTick", descriptor: TypedPropertyDescriptor<ActionHandler & TickIntervalDecoratorFlag>) => TypedPropertyDescriptor<ActionHandler>;
type AnyFunctionDecorator = (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: any[]) => any>) => TypedPropertyDescriptor<(...args: any[]) => any>;

type HandlerInterceptor<S> = (handler: ActionHandler, rootState: Readonly<S>) => SagaIterator;

/**
 * A helper for ActionHandler functions (Saga)
 */
export function createActionHandlerDecorator<S extends State = State>(interceptor: HandlerInterceptor<S>): HandlerDecorator {
    return (target, propertyKey, descriptor) => {
        const fn = descriptor.value!;
        descriptor.value = function*(...args: any[]): SagaIterator {
            const rootState: S = app.store.getState() as S;
            yield* interceptor(fn.bind(this, ...args), rootState);
        };
        return descriptor;
    };
}

/**
 * To mark state.loading[identifier] during Saga execution
 */
export function Loading(identifier: string = "global"): HandlerDecorator {
    return createActionHandlerDecorator(function*(handler) {
        try {
            yield put(loadingAction(true, identifier));
            yield* handler();
        } finally {
            yield put(loadingAction(false, identifier));
        }
    });
}

/**
 * To log (Result=OK) this action, including action name and parameters (masked)
 */
export function Log(): HandlerDecorator {
    return (target, propertyKey, descriptor) => {
        const fn = descriptor.value!;
        descriptor.value = function*(...args: any[]): SagaIterator {
            if (app.loggerConfig) {
                // Do not use fn directly, it is a different object
                const params = stringifyWithMask(app.loggerConfig.maskedKeywords || [], "***", ...args);
                const logTypeName = (descriptor.value as any).actionName;
                const onLogEnd = app.logger.info(logTypeName, params ? {params} : {});
                try {
                    yield* fn.bind(this)(...args);
                } finally {
                    onLogEnd();
                }
            } else {
                yield* fn.bind(this)(...args);
            }
        };
        return descriptor;
    };
}

/**
 * Required decorator when using lifecycle actions, including onRender/onDestroy/...
 */
export function Lifecycle(): LifecycleHandlerDecorator {
    return (target, propertyKey, descriptor) => {
        descriptor.value!.isLifecycle = true;
        return descriptor;
    };
}

/**
 * Used for onTick action, to specify to tick interval in second
 */
export function Interval(second: number): OnTickHandlerDecorator {
    return (target, propertyKey, descriptor) => {
        descriptor.value!.tickInterval = second;
        return descriptor;
    };
}

/**
 * If specified, the Saga action cannot be entered by other threads during execution
 * Useful for error handler action
 */
export function Mutex() {
    let isLocked = false;
    return createActionHandlerDecorator(function*(handler) {
        if (!isLocked) {
            try {
                isLocked = true;
                yield* handler();
            } finally {
                isLocked = false;
            }
        }
    });
}

const defaultMemoKeyGenerator = (args: any[]) => JSON.stringify(args);
export function Memo(memoKeyGenerator: (args: any[]) => string = defaultMemoKeyGenerator): AnyFunctionDecorator {
    return (target: any) => {
        const descriptor = target.descriptor;
        const fn = descriptor.value;
        const cache = {};
        descriptor.value = (...args: any[]) => {
            const paramKey = memoKeyGenerator(args);
            if (!cache[paramKey]) {
                cache[paramKey] = fn(...args);
            }
            return cache[paramKey];
        };
        return target;
    };
}

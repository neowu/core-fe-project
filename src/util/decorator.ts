import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {ActionHandler, LifecycleDecoratorFlag, ModuleLifecycleListener, TickIntervalDecoratorFlag} from "../module/handler";
import {loadingAction, State} from "../reducer";

/**
 * Decorator type declaration, required by TypeScript
 */
type HandlerDecorator = (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<ActionHandler>) => TypedPropertyDescriptor<ActionHandler>;
type LifecycleHandlerDecorator = (target: object, propertyKey: keyof ModuleLifecycleListener, descriptor: TypedPropertyDescriptor<ActionHandler & LifecycleDecoratorFlag>) => TypedPropertyDescriptor<ActionHandler>;
type OnTickHandlerDecorator = (target: object, propertyKey: "onTick", descriptor: TypedPropertyDescriptor<ActionHandler & TickIntervalDecoratorFlag>) => TypedPropertyDescriptor<ActionHandler>;
type HandlerInterceptor<S> = (handler: ActionHandler, rootState: Readonly<S>) => SagaIterator;

/**
 * Used for ActionHandler functions
 */
export function createActionHandlerDecorator<S extends State = State>(interceptor: HandlerInterceptor<S>): HandlerDecorator {
    return (target, propertyKey, descriptor) => {
        const handler = descriptor.value!;
        descriptor.value = function*(...args: any[]): SagaIterator {
            const rootState: S = (target as any).rootState;
            if (rootState) {
                yield* interceptor(handler.bind(this, ...args), rootState);
            } else {
                throw new Error("decorator must be applied to handler method");
            }
        };
        return descriptor;
    };
}

/**
 * Built-in ActionHandler decorators
 */
export function Loading(identifier: string = "global"): HandlerDecorator {
    return createActionHandlerDecorator(function*(handler) {
        try {
            yield put(loadingAction(identifier, true));
            yield* handler();
        } finally {
            yield put(loadingAction(identifier, false));
        }
    });
}

export function Lifecycle(): LifecycleHandlerDecorator {
    return (target, propertyKey, descriptor) => {
        descriptor.value!.isLifecycle = true;
        return descriptor;
    };
}

export function Interval(second: number): OnTickHandlerDecorator {
    return (target, propertyKey, descriptor) => {
        descriptor.value!.tickInterval = second;
        return descriptor;
    };
}

import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {loadingAction} from "./reducer";
import {EffectHandler} from "./store";

type EffectMethodDecorator = (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<EffectHandler>) => TypedPropertyDescriptor<EffectHandler>;

// Decorated function must be a generator
// Ref: https://github.com/Microsoft/TypeScript/issues/17936
export function loading(loading: string): EffectMethodDecorator {
    return (target, propertyKey, descriptor) => {
        const effect: EffectHandler = descriptor.value!;
        descriptor.value = function*(...args: any[]): SagaIterator {
            try {
                yield put(loadingAction(loading, true));
                yield* effect(args);
            } finally {
                yield put(loadingAction(loading, false));
            }
        };
        return descriptor;
    };
}

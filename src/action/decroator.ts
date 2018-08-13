import {SagaIterator} from "redux-saga";
import {State} from "../state";
import {EffectHandler} from "../type";

type EffectDecorator = (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<EffectHandler>) => TypedPropertyDescriptor<EffectHandler>;

export function effectDecorator<S extends State = State>(decorator: (effect: EffectHandler, rootState: Readonly<S>) => SagaIterator): EffectDecorator {
    return (target, propertyKey, descriptor) => {
        const effect: EffectHandler = descriptor.value!;
        descriptor.value = function*(...args: any[]): SagaIterator {
            const rootState: S = (target as any).rootState;
            if (rootState) {
                yield* decorator(effect.bind(this, ...args), rootState);
            } else {
                throw new Error("decorator must be applied to handler method");
            }
        };
        return descriptor;
    };
}

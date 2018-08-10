import {SagaIterator} from "redux-saga";
import {EffectHandler} from "./store";
import {State} from "../state";

type EffectMethodDecorator = (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<EffectHandler>) => TypedPropertyDescriptor<EffectHandler>;
export function createEffectMethodDecorator<S extends State = State>(handler: (originalEffect: () => SagaIterator, currentRootState: Readonly<S>) => SagaIterator): EffectMethodDecorator {
    return (target, propertyKey, descriptor) => {
        const originalHandler: EffectHandler = descriptor.value!;
        descriptor.value = function*(...args: any[]): SagaIterator {
            const rootState: S = (target as any).rootState;
            yield* handler(originalHandler.bind(this, ...args), rootState);
        };

        return descriptor;
    };
}

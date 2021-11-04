import {ActionHandler, TickIntervalDecoratorFlag} from "../module";

type OnTickHandlerDecorator = (target: object, propertyKey: "onTick", descriptor: TypedPropertyDescriptor<ActionHandler & TickIntervalDecoratorFlag>) => TypedPropertyDescriptor<ActionHandler>;

/**
 * For *onTick() action only, to specify to tick interval in second.
 */
export function Interval(defaultInterval: number, idleInterval?: number): OnTickHandlerDecorator {
    return (target, propertyKey, descriptor) => {
        descriptor.value!.tickInterval = defaultInterval;
        if (idleInterval) {
            descriptor.value!.idleTickInterval = idleInterval;
        }
        return descriptor;
    };
}

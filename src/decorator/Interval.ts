import {ActionHandler, TickIntervalDecoratorFlag} from "../module";

type OnTickHandlerDecorator = (target: object, propertyKey: "onTick", descriptor: TypedPropertyDescriptor<ActionHandler & TickIntervalDecoratorFlag>) => TypedPropertyDescriptor<ActionHandler>;

/**
 * For *onTick() action only, to specify to tick interval in second.
 */
export function Interval(second: number): OnTickHandlerDecorator {
    return (target, propertyKey, descriptor) => {
        descriptor.value!.tickInterval = second;
        return descriptor;
    };
}

/**
 * For *onTick() action only, to specify to tick interval in second when page enter idle mode
 */
export function IdleInterval(second: number): OnTickHandlerDecorator {
    return (target, propertyKey, descriptor) => {
        descriptor.value!.idleTickInterval = second;
        return descriptor;
    };
}

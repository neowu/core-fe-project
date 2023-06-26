import type {ActionHandler, TickIntervalDecoratorFlag} from "../module";

export interface OnTickMethodDecorator<Fn extends ActionHandler & TickIntervalDecoratorFlag> extends Omit<ClassMethodDecoratorContext<unknown, Fn>, "name"> {
    readonly name: "onTick";
}

/**
 * For *onTick() action only, to specify to tick interval in second.
 */
export function Interval<Fn extends ActionHandler>(second: number) {
    return function (target: Fn, _: OnTickMethodDecorator<Fn>) {
        Reflect.defineProperty(target, "tickInterval", {
            value: second,
            writable: false,
        });
    };
}

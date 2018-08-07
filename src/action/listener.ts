import {Action as HistoryAction, Location} from "history";
import {delay, SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";
import {Exception} from "./exception";
import {run} from "./handler";

export interface Listener {
    onInitialized?(): SagaIterator;

    onLocationChanged?(event: LocationChangedEvent): SagaIterator;

    onError?(error: Exception): SagaIterator;

    onTick?(): SagaIterator;
}

export interface LocationChangedEvent {
    location: Location;
    action: HistoryAction;
}

export type TickListener = (() => SagaIterator) & {
    interval?: number;
};

export function interval(seconds: number): MethodDecorator {
    return (target, propertyKey, descriptor: TypedPropertyDescriptor<any>): void => {
        const handler: TickListener = descriptor.value;
        handler.interval = seconds;
    };
}

export function* tick(onTick: TickListener): SagaIterator {
    while (true) {
        // use call instead of fork, to delay next tick execution if onTick() took long. usually, it will not happen! Because we only put(action) within most onTick(), which is a non-blocking effect.
        yield call(run, onTick, []);
        yield call(delay, (onTick.interval || 1) * 1000);
    }
}

import {Action as HistoryAction, Location} from "history";
import {SagaIterator} from "redux-saga";
import {Exception} from "./exception";

export interface Listener {
    onInitialized?(): void;

    onLocationChanged?(event: LocationChangedEvent): void;

    onError?(error: Exception): void;

    onTick?(): void;
}

export interface LocationChangedEvent {
    location: Location;
    action: HistoryAction;
}

export type TickListener = (() => SagaIterator) & {
    interval: number;
};

export function interval(seconds: number): MethodDecorator {
    return (target, propertyKey, descriptor: PropertyDescriptor): void => {
        const handler: TickListener = descriptor.value;
        handler.interval = seconds;
    };
}

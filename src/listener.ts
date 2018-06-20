import {Action as HistoryAction, Location} from "history";
import {SagaIterator} from "redux-saga";

export interface Listener {
    onInitialized?();

    onLocationChanged?(event: LocationChangedEvent);

    onError?(error: any); // TODO: formalize error type

    onTick?();
}

export interface LocationChangedEvent {
    location: Location;
    action: HistoryAction;
}

export type TickListener = (() => SagaIterator) & {
    interval: number;
};

export function interval(seconds: number): MethodDecorator {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor): void => {
        const handler: TickListener = descriptor.value;
        handler.interval = seconds;
    };
}

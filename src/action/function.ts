import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {errorAction} from "../exception";
import {loadingAction} from "./loading";

export type ActionFunction = ((...args: any[]) => any) & {
    loading?: string;
    global?: boolean;
};

export function loading(loading: string): MethodDecorator {
    return (target, propertyKey, descriptor: PropertyDescriptor): void => {
        const handler: ActionFunction = descriptor.value;
        handler.loading = loading;
    };
}

export function global(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const handler: ActionFunction = descriptor.value;
    handler.global = true;
}

export function* run<S>(handler: ActionFunction, payload?: any): SagaIterator {
    try {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, true));
        }

        if (!payload) {
            yield* handler() as SagaIterator;
        } else if (Array.isArray(payload)) {
            yield* handler(...payload) as SagaIterator;
        } else {
            // For onError & onLocationChange
            yield* handler(payload) as SagaIterator;
        }
    } catch (error) {
        yield put(errorAction(error));
    } finally {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, false));
        }
    }
}

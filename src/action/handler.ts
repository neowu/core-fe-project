import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {errorAction} from "../exception";
import {ActionHandler} from "../type";
import {loadingAction} from "./loading";

export function loading(loading: string): MethodDecorator {
    return (target, propertyKey, descriptor: PropertyDescriptor): void => {
        const handler: ActionHandler<any> = descriptor.value;
        handler.loading = loading;
    };
}

export function global(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const handler: ActionHandler<any> = descriptor.value;
    handler.global = true;
}

export function* run(handler: ActionHandler<any>, payload: any[]): SagaIterator {
    try {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, true));
        }
        yield* handler(...payload) as SagaIterator;
    } catch (error) {
        yield put(errorAction(error));
    } finally {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, false));
        }
    }
}

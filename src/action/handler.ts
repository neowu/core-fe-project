import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {errorAction} from "../exception";
import {loadingAction} from "./loading";

export type ActionHandler = ((...args: any[]) => any) & {
    loading?: string;
    global?: boolean;
};

export class ActionHandlers {
    private handlers: {[actionType: string]: {[namespace: string]: ActionHandler}} = {};

    public put(actionType: string, namespace: string, handler: ActionHandler): void {
        if (!this.handlers[actionType]) {
            this.handlers[actionType] = {};
        }
        this.handlers[actionType][namespace] = handler;
    }

    public get(actionType: string): {[namespace: string]: ActionHandler} {
        return this.handlers[actionType];
    }
}

export function loading(loading: string): MethodDecorator {
    return (target, propertyKey, descriptor: PropertyDescriptor): void => {
        const handler: ActionHandler = descriptor.value;
        handler.loading = loading;
    };
}

export function global(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const handler: ActionHandler = descriptor.value;
    handler.global = true;
}

export function* run(handler: ActionHandler, ...payload: any[]): SagaIterator {
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

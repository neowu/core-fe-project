import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {errorAction} from "./exception";
import {loadingAction} from "./loading";
import {State} from "./state";

interface HandlerMetadata {
    effect?: boolean;
    loading?: string;
    global?: boolean;
}

export type Handler<S> = ((payload?: any, state?: S, rootState?: State) => S | SagaIterator) & HandlerMetadata;

export class HandlerMap {
    private handlers: {[actionType: string]: {[namespace: string]: Handler<any>}} = {};

    public put(actionType: string, namespace: string, handler: Handler<any>): void {
        if (!this.handlers[actionType]) {
            this.handlers[actionType] = {};
        }
        this.handlers[actionType][namespace] = handler;
    }

    public get(actionType: string): {[namespace: string]: Handler<any>} {
        return this.handlers[actionType];
    }
}

export function effect(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const handler: Handler<any> = descriptor.value;
    handler.effect = true;
}

export function loading(loading: string): MethodDecorator {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor): void => {
        const handler: Handler<any> = descriptor.value;
        handler.loading = loading;
    };
}

export function global(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const handler: Handler<any> = descriptor.value;
    handler.global = true;
}

export function* run<S>(handler: Handler<S>, payload?: any, state?: S, rootState?: State): SagaIterator {
    try {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, true));
        }
        yield* handler(payload, state, rootState);
    } catch (error) {
        console.error(error);
        yield put(errorAction(error));
    } finally {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, false));
        }
    }
}

export function qualifiedActionType(handler: Handler<any>, namespace: string, actionType: string): string {
    return handler.global ? actionType : `${namespace}/${actionType}`;
}

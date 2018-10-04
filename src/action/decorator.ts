import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {State} from "../state";
import {ActionHandler} from "./handler";
import {devToolsLogAction, loadingAction} from "./reducer";

type HandlerDecorator = (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<ActionHandler>) => TypedPropertyDescriptor<ActionHandler>;
type HandlerInterceptor<S> = (handler: ActionHandler, rootState: Readonly<S>) => SagaIterator;

export function handlerDecorator<S extends State = State>(interceptor: HandlerInterceptor<S>): HandlerDecorator {
    return (target, propertyKey, descriptor) => {
        const handler: ActionHandler = descriptor.value!;
        descriptor.value = function*(...args: any[]): SagaIterator {
            const rootState: S = (target as any).rootState;
            if (rootState) {
                yield* interceptor(handler.bind(this, ...args), rootState);
            } else {
                throw new Error("decorator must be applied to handler method");
            }
        };
        return descriptor;
    };
}

export function loading(identifier: string) {
    return handlerDecorator(function*(handler) {
        try {
            yield put(loadingAction(identifier, true));
            yield* handler();
        } finally {
            yield put(loadingAction(identifier, false));
        }
    });
}

export function noReduxDevToolsLog() {
    return handlerDecorator(function*(handler) {
        try {
            yield put(devToolsLogAction(false));
            yield* handler();
        } finally {
            yield put(devToolsLogAction(true));
        }
    });
}

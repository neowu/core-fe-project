import {put} from "redux-saga/effects";
import {loadingAction} from "../reducer";
import {createModuleActionDecorator, HandlerDecorator} from "./helper";

export function loading(identifier: string = "global") {
    return createModuleActionDecorator(function*(handler) {
        try {
            yield put(loadingAction(identifier, true));
            yield* handler();
        } finally {
            yield put(loadingAction(identifier, false));
        }
    });
}

export function interval(second: number): HandlerDecorator {
    return (target, propertyKey, descriptor) => {
        (descriptor.value as any).tickInterval = second;
        return target;
    };
}

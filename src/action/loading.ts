import {put} from "redux-saga/effects";
import {effectDecorator} from "./decroator";
import {loadingAction} from "./reducer";

// Decorated function must be a generator
// Ref: https://github.com/Microsoft/TypeScript/issues/17936
export function loading(loading: string) {
    return effectDecorator(function*(effect) {
        try {
            yield put(loadingAction(loading, true));
            yield* effect();
        } finally {
            yield put(loadingAction(loading, false));
        }
    });
}

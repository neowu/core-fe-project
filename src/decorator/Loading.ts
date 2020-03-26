import {createActionHandlerDecorator} from "./index";
import {put} from "redux-saga/effects";
import {loadingAction} from "../reducer";

/**
 * To mark state.loading[identifier] during action execution.
 */
export function Loading(identifier: string = "global") {
    return createActionHandlerDecorator(function* (handler) {
        try {
            yield put(loadingAction(true, identifier));
            yield* handler();
        } finally {
            yield put(loadingAction(false, identifier));
        }
    });
}

import {SagaIterator} from "redux-saga";
import {delay, put, takeEvery} from "redux-saga/effects";
import {app} from "./app";
import {ActionHandler, ModuleLifecycleListener} from "./handler";
import {getModuleRenderParameterFromRoute} from "./platform/route";
import {Action, ERROR_ACTION_TYPE, errorAction} from "./reducer";

export function* rootSaga() {
    yield takeEvery("*", function*(action: Action<any>) {
        if (action.type === ERROR_ACTION_TYPE) {
            if (app.errorHandler) {
                yield* app.errorHandler(action.payload);
            }
        } else {
            const handler = app.actionHandlers[action.type];
            if (handler) {
                yield* runSafely(handler, ...action.payload);
            }
        }
    });
}

export function* lifecycleSaga(props: any, lifecycleListener: ModuleLifecycleListener<any>) {
    if (lifecycleListener.onRegister.isLifecycle) {
        yield* runSafely(lifecycleListener.onRegister.bind(lifecycleListener));
    }

    if (lifecycleListener.onRender.isLifecycle) {
        yield* runSafely(lifecycleListener.onRender.bind(lifecycleListener), ...getModuleRenderParameterFromRoute(props));
    }

    if (lifecycleListener.onTick.isLifecycle) {
        const tickIntervalInMillisecond = (lifecycleListener.onTick.tickInterval || 5) * 1000;
        const boundTicker = lifecycleListener.onTick.bind(lifecycleListener);
        while (true) {
            yield* runSafely(boundTicker);
            yield delay(tickIntervalInMillisecond);
        }
    }
}

function* runSafely(handler: ActionHandler, ...payload: any[]): SagaIterator {
    try {
        yield* handler(...payload);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error("Redux Saga Error");
            console.error(error);
        }
        yield put(errorAction(error));
    }
}

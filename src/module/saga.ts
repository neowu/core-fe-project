import {SagaIterator} from "redux-saga";
import {delay, put, takeEvery} from "redux-saga/effects";
import {app} from "../app";
import {completeInitialization} from "../platform/react-dom";
import {Action, ERROR_ACTION_TYPE, errorAction} from "../reducer";
import {ActionHandler, ModuleLifecycleListener} from "./handler";

export function* rootSaga() {
    yield takeEvery("*", function*(action: Action<any>) {
        if (action.type === ERROR_ACTION_TYPE) {
            // Error handler is supposed to throw no error
            for (const errorHandler of app.errorHandlers) {
                yield* errorHandler(action.payload);
            }
        } else {
            const handler = app.actionHandlers[action.type];
            if (handler) {
                yield* runSafely(handler, ...action.payload);
            }
        }
    });
}

export function* lifecycleSaga(props: any, lifecycleListener: ModuleLifecycleListener<any>, moduleName: string) {
    if (lifecycleListener.onRegister.isLifecycle) {
        yield* runSafely(lifecycleListener.onRegister.bind(lifecycleListener));
    }

    if (lifecycleListener.onEnter.isLifecycle) {
        if (props.match && props.location) {
            // Safely suppose this component is connected to <Route>
            yield* runSafely(lifecycleListener.onEnter.bind(lifecycleListener), props.match.params, props.location);
        } else {
            yield* runSafely(lifecycleListener.onEnter.bind(lifecycleListener), {}, app.history.location);
        }
    }

    app.modules[moduleName] = true;
    if (Object.values(app.modules).every(_ => _)) {
        completeInitialization(false);
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

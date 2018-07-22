import {Store} from "redux";
import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {errorAction} from "../exception";
import {initialState} from "../state";
import {Action, EffectHandler, State} from "../type";
import {loadingAction} from "./loading";

let state = initialState;

export abstract class Handler<S extends object> {
    readonly namespace: string;
    private readonly initialState: S;

    protected constructor(namespace: string, initialState: S) {
        this.namespace = namespace;
        this.initialState = initialState;
    }

    state(): Readonly<S> {
        return state.app[this.namespace];
    }

    rootState(): Readonly<State> {
        return state;
    }

    resetState(): S {
        return this.initialState;
    }

    reduceState(newState: Partial<S>): S {
        return Object.assign({}, this.state(), newState);
    }
}

export const handlerListener = (store: Store<State, Action<any>>) => () => {
    state = store.getState();
};

export function* run(handler: EffectHandler, payload: any[]): SagaIterator {
    try {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, true));
        }
        yield* handler(...payload);
    } catch (error) {
        yield put(errorAction(error));
    } finally {
        if (handler.loading) {
            yield put(loadingAction(handler.loading, false));
        }
    }
}

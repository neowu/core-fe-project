import {setStateAction, SetStateActionPayload} from "./setState";
import {Store} from "redux";
import {SagaIterator} from "redux-saga";
import {put, PutEffect} from "redux-saga/effects";
import {initialState, State} from "../state";
import {Action} from "../type";
import {errorAction} from "./error";
import {loadingAction} from "./loading";
import {EffectHandler} from "./store";

let state = initialState;

export class Handler<S extends object, R extends State = State> {
    readonly namespace: string;
    private readonly initialState: S;

    public constructor(namespace: string, initialState: S) {
        this.namespace = namespace;
        this.initialState = initialState;
    }

    get state(): Readonly<S> {
        return state.app[this.namespace];
    }

    get rootState(): Readonly<R> {
        return state as Readonly<R>;
    }

    resetState(): PutEffect<Action<SetStateActionPayload>> {
        return put(setStateAction(this.namespace, this.initialState));
    }

    setState(newState: Partial<S>): PutEffect<Action<SetStateActionPayload>> {
        return put(setStateAction(this.namespace, newState));
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

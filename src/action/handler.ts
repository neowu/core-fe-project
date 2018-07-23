import {Store} from "redux";
import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {errorAction} from "../exception";
import {initialState, State} from "../state";
import {Action} from "../type";
import {loadingAction} from "./loading";
import {EffectHandler} from "./store";

let state = initialState;

export class Handler<S extends object, RS extends State = State> {
    readonly namespace: string;
    private readonly initialState: S;

    public constructor(namespace: string, initialState: S) {
        this.namespace = namespace;
        this.initialState = initialState;
    }

    get state(): Readonly<S> {
        return state.app[this.namespace];
    }

    get rootState(): Readonly<RS> {
        return state as Readonly<RS>;
    }

    resetState(): S {
        return this.initialState;
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

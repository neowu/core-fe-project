import {StrictEffect} from "redux-saga/effects";
import {call as rawCall, Effect, put as rawPut, race as rawRace, spawn, all, delay} from "redux-saga/effects";
import {Action} from "./reducer";

type SagaGenerator<RT> = Generator<Effect<any>, RT, any>;

type UnwrapReturnType<R> = R extends SagaGenerator<infer RT> ? RT : R extends Promise<infer PromiseValue> ? PromiseValue : R;

export type SagaIterator = IterableIterator<StrictEffect> | Iterator<StrictEffect, any, any>;

export function* call<Args extends any[], R>(fn: (...args: Args) => R, ...args: Args): SagaGenerator<UnwrapReturnType<R>> {
    return yield rawCall(fn, ...args);
}

export function* put<T extends Action<any>>(action: T): SagaGenerator<T> {
    return yield rawPut(action);
}

export function race<T extends object>(effects: T): SagaGenerator<{[P in keyof T]?: UnwrapReturnType<T[P]>}>;
export function race<T>(effects: T[]): SagaGenerator<UnwrapReturnType<T>>;
export function* race<T extends object>(effects: T): SagaGenerator<{[P in keyof T]?: UnwrapReturnType<T[P]>}> {
    return yield rawRace(effects as any);
}

export {spawn, all, delay};

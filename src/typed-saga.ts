import {StrictEffect, Effect, call as rawCall, race as rawRace, spawn, all as rawAll, delay, put} from "redux-saga/effects";

type SagaGeneratorWithReturn<RT> = Generator<Effect, RT, any>;

type UnwrapReturnType<R> = R extends SagaGeneratorWithReturn<infer RT> ? RT : R extends Promise<infer PromiseValue> ? PromiseValue : R;

export type SagaGenerator = Generator<StrictEffect>;

export function* call<Args extends any[], R>(fn: (...args: Args) => R, ...args: Args): SagaGeneratorWithReturn<UnwrapReturnType<R>> {
    return yield rawCall(fn, ...args);
}

export function* race<T extends Record<string, unknown>>(effects: T): SagaGeneratorWithReturn<{[P in keyof T]?: UnwrapReturnType<T[P]>}> {
    return yield rawRace(effects);
}

export function* all<T extends Record<string, unknown>>(effects: T): SagaGeneratorWithReturn<{[P in keyof T]: UnwrapReturnType<T[P]>}> {
    return yield rawAll(effects);
}

export {spawn, delay, put};

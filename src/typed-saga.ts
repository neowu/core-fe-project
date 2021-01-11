import {StrictEffect, Effect, call as rawCall, race as rawRace, spawn, all as rawAll, delay, put} from "redux-saga/effects";

type SagaGeneratorWithReturn<RT> = Generator<Effect, RT, any>;

type UnwrapReturnType<R> = R extends SagaGeneratorWithReturn<infer RT> ? RT : R extends Promise<infer PromiseValue> ? PromiseValue : R;

export type SagaGenerator = Generator<StrictEffect>;

export function* call<Args extends any[], R>(fn: (...args: Args) => R, ...args: Args): SagaGeneratorWithReturn<UnwrapReturnType<R>> {
    return yield rawCall(fn, ...args);
}

export function race<T extends Record<string, unknown>>(effects: T): SagaGeneratorWithReturn<{[P in keyof T]?: UnwrapReturnType<T[P]>}>;
export function race<T1, T2>(effects: [T1, T2]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>?, UnwrapReturnType<T2>?]>;
export function race<T1, T2, T3>(effects: [T1, T2, T3]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>?, UnwrapReturnType<T2>?, UnwrapReturnType<T3>?]>;
export function race<T1, T2, T3, T4>(effects: [T1, T2, T3, T4]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>?, UnwrapReturnType<T2>?, UnwrapReturnType<T3>?, UnwrapReturnType<T4>?]>;
export function race<T1, T2, T3, T4, T5>(effects: [T1, T2, T3, T4, T5]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>?, UnwrapReturnType<T2>?, UnwrapReturnType<T3>?, UnwrapReturnType<T4>?, UnwrapReturnType<T5>?]>;
export function race<T>(effects: T[]): SagaGeneratorWithReturn<Array<UnwrapReturnType<T> | undefined>>;
export function* race(effects: any): any {
    return yield rawRace(effects);
}

export function all<T extends Record<string, unknown>>(effects: T): SagaGeneratorWithReturn<{[P in keyof T]: UnwrapReturnType<T[P]>}>;
export function all<T1, T2>(effects: [T1, T2]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>, UnwrapReturnType<T2>]>;
export function all<T1, T2, T3>(effects: [T1, T2, T3]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>, UnwrapReturnType<T2>, UnwrapReturnType<T3>]>;
export function all<T1, T2, T3, T4>(effects: [T1, T2, T3, T4]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>, UnwrapReturnType<T2>, UnwrapReturnType<T3>, UnwrapReturnType<T4>]>;
export function all<T1, T2, T3, T4, T5>(effects: [T1, T2, T3, T4, T5]): SagaGeneratorWithReturn<[UnwrapReturnType<T1>, UnwrapReturnType<T2>, UnwrapReturnType<T3>, UnwrapReturnType<T4>, UnwrapReturnType<T5>]>;
export function all<T>(effects: T[]): SagaGeneratorWithReturn<Array<UnwrapReturnType<T>>>;
export function* all(effects: any): any {
    return yield rawAll(effects);
}

export {spawn, delay, put};

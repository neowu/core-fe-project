import {StrictEffect, call as rawCall, Effect, race as rawRace, spawn, all as rawAll, delay, put} from "redux-saga/effects";

type StrictObject<T extends {}> = T extends any[] ? never : T;

type SagaGenerator<RT> = Generator<Effect<any>, RT, any>;

type UnwrapReturnType<R> = R extends SagaGenerator<infer RT> ? RT : R extends Promise<infer PromiseValue> ? PromiseValue : R;

export type SagaIterator = IterableIterator<StrictEffect> | Iterator<StrictEffect, any, any>;

export function* call<Args extends any[], R>(fn: (...args: Args) => R, ...args: Args): SagaGenerator<UnwrapReturnType<R>> {
    return yield rawCall(fn, ...args);
}

export function* race<T extends {}>(effects: StrictObject<T>): SagaGenerator<{[P in keyof T]?: UnwrapReturnType<T[P]>}> {
    return yield rawRace(effects);
}

export function* all<T extends {}>(effects: StrictObject<T>): SagaGenerator<{[P in keyof T]: UnwrapReturnType<T[P]>}> {
    return yield rawAll(effects);
}

export {spawn, delay, put};

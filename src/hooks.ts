import React from "react";
import {Action, State} from "./reducer";
import {useDispatch, useSelector} from "react-redux";

type DeferLiteralArrayCheck<T> = T extends Array<string | number | boolean | null | undefined> ? T : never;

export function useLoadingStatus(identifier: string = "global"): boolean {
    return useSelector((state: State) => state.loading[identifier] > 0);
}

/**
 * Action parameters must be of primitive types, so that the dependency check can work well.
 * No need add dispatch to dep list, because it is always fixed.
 */
export function useAction<P extends Array<string | number | boolean | null | undefined>>(actionCreator: (...args: P) => Action<P>, ...deps: P): () => void {
    const dispatch = useDispatch();
    return React.useCallback(() => dispatch(actionCreator(...deps)), deps);
}

/**
 * For actions like:
 * *foo(a: number, b: string, c: boolean): SagaGenerator {..}
 *
 * useUnaryAction(foo, 100, "") will return:
 * (c: boolean) => void;
 */
export function useUnaryAction<P extends any[], U>(actionCreator: (...args: [...P, U]) => Action<[...DeferLiteralArrayCheck<P>, U]>, ...deps: P): (arg: U) => void {
    const dispatch = useDispatch();
    return React.useCallback((arg: U) => dispatch(actionCreator(...deps, arg)), deps);
}

/**
 * For actions like:
 * *foo(a: number, b: string, c: boolean): SagaGenerator {..}
 *
 * useBinaryAction(foo, 100) will return:
 * (b: string, c: boolean) => void;
 */
export function useBinaryAction<P extends any[], U, K>(actionCreator: (...args: [...P, U, K]) => Action<[...DeferLiteralArrayCheck<P>, U, K]>, ...deps: P): (arg1: U, arg2: K) => void {
    const dispatch = useDispatch();
    return React.useCallback((arg1: U, arg2: K) => dispatch(actionCreator(...deps, arg1, arg2)), deps);
}

/**
 * For actions like:
 * *foo(data: {key: number}): SagaGenerator {..}
 *
 * useModuleObjectAction(foo, "key") will return:
 * (objectValue: number) => void;
 */
export function useObjectKeyAction<T extends object, K extends keyof T>(actionCreator: (arg: T) => Action<[T]>, objectKey: K): (objectValue: T[K]) => void {
    const dispatch = useDispatch();
    return React.useCallback((objectValue: T[K]) => dispatch(actionCreator({[objectKey]: objectValue} as T)), [dispatch, actionCreator, objectKey]);
}

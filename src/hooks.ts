import React from "react";
import {Action, State} from "./reducer";
import {useDispatch, useSelector} from "react-redux";

export function useLoadingStatus(identifier: string = "global"): boolean {
    return useSelector((state: State) => state.loading[identifier] > 0);
}

/**
 * Action parameters must be of primitive types, so that the dependency check can work well.
 * No need add dispatch to dep list, because it is always fixed.
 */
export function useModuleAction<P extends Array<string | number | boolean | null | undefined>>(actionCreator: (...args: P) => Action<P>, ...deps: P): () => void {
    const dispatch = useDispatch();
    return React.useCallback(() => dispatch(actionCreator(...deps)), deps);
}

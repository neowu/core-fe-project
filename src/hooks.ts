import React from "react";
import {Action, State} from "./reducer";
import {useDispatch, useSelector} from "react-redux";

export function useLoadingStatus(identifier: string = "global"): boolean {
    return useSelector((state: State) => state.loading[identifier] > 0);
}

export function useModuleAction<P extends any[]>(actionCreator: (...args: P) => Action<P>, ...deps: P): () => void {
    const dispatch = useDispatch();
    // No need add dispatch to dep list, because it is always fixed
    return React.useCallback(() => dispatch(actionCreator(...deps)), deps);
}

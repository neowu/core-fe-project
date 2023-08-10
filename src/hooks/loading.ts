import {useSelector} from "react-redux";
import type {State} from "../reducer";

export function useLoadingStatus(identifier: string = "global"): boolean {
    return useSelector((state: State) => state.loading[identifier] > 0);
}

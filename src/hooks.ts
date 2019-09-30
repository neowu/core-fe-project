import {State} from "./reducer";
import {useSelector} from "react-redux";

export function useLoadingStatus(identifier: string = "global"): boolean {
    return useSelector((state: State) => state.loading[identifier] > 0);
}

import {Handler} from "./handler";
import {Action} from "../type";
import {Listener} from "./listener";

// Actions can have maximum 5 parameters
type ActionCreator0 = () => Action<void[]>;
type ActionCreator1<P> = (arg1: P) => Action<[P]>;
type ActionCreator2<P1, P2> = (arg1: P1, arg2: P2) => Action<[P1, P2]>;
type ActionCreator3<P1, P2, P3> = (arg1: P1, arg2: P2, arg3: P3) => Action<[P1, P2, P3]>;
type ActionCreator4<P1, P2, P3, P4> = (arg1: P1, arg2: P2, arg3: P3, arg4: P4) => Action<[P1, P2, P3, P4]>;
type ActionCreator5<P1, P2, P3, P4, P5> = (arg1: P1, arg2: P2, arg3: P3, arg4: P4, arg5: P5) => Action<[P1, P2, P3, P4, P5]>;

// If ActionCreator is in-lined into ActionCreators, IDE cannot get correct Type infer information
type ActionCreator<H> = H extends () => any
    ? ActionCreator0
    : H extends (arg1: infer P1) => any
        ? ActionCreator1<P1>
        : H extends (arg1: infer P1, arg2: infer P2) => any
            ? ActionCreator2<P1, P2>
            : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3) => any
                ? ActionCreator3<P1, P2, P3>
                : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3, arg4: infer P4) => any ? ActionCreator4<P1, P2, P3, P4> : H extends (arg1: infer P1, arg2: infer P2, arg3: infer P3, arg4: infer P4, arg5: infer P5) => any ? ActionCreator5<P1, P2, P3, P4, P5> : never;

export type ActionCreators<H> = {readonly [K in Exclude<keyof H, "state" | "rootState" | "namespace" | keyof Listener>]: ActionCreator<H[K]>};

export function actionCreator<H extends Handler<any>>(handler: H): ActionCreators<H> {
    const actionCreators = {};

    const keys = [...Object.keys(Object.getPrototypeOf(handler)), "resetState"];
    keys.forEach(actionType => {
        const qualifiedActionType = `${handler.namespace}/${actionType}`;
        actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
    });

    return actionCreators as ActionCreators<H>;
}

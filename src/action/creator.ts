import {Action} from "../type";
import {Handler} from "./handler";
import {Listener} from "./listener";
import {keys} from "./register";

type ActionCreator<H> = H extends <P>(...args: infer P) => any ? ((...args: P) => Action<P>) : never;

export type ActionCreators<H> = {readonly [K in Exclude<keyof H, "state" | "rootState" | "namespace" | keyof Listener>]: ActionCreator<H[K]>};

export function actionCreator<H extends Handler<any>>(handler: H): ActionCreators<H> {
    const actionCreators = {};

    keys(handler).forEach(actionType => {
        const qualifiedActionType = `${handler.namespace}/${actionType}`;
        actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
    });

    return actionCreators as ActionCreators<H>;
}

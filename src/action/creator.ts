import {SagaIterator} from "redux-saga";
import {Action} from "../type";
import {Handler} from "./handler";
import {Listener} from "./listener";
import {keys} from "./register";

type ActionCreator<H> = H extends <P>(...args: infer P) => SagaIterator ? ((...args: P) => Action<P>) : never;
type HandlerKeys<H> = {[K in keyof H]: H[K] extends (...args: any[]) => SagaIterator ? K : never}[Exclude<keyof H, keyof Listener>];
type ActionCreators<H> = {readonly [K in HandlerKeys<H>]: ActionCreator<H[K]>};

export function actionCreator<H extends Handler<any>>(handler: H): ActionCreators<H> {
    const actionCreators = {};

    keys(handler).forEach(actionType => {
        const qualifiedActionType = `${handler.module}/${actionType}`;
        actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
    });

    return actionCreators as ActionCreators<H>;
}

import {SagaIterator} from "redux-saga";
import {Action} from "../type";
import {Handler} from "./handler";
import {Listener} from "./listener";
import {keys} from "./register";

type ActionCreator<H> = H extends <P>(...args: infer P) => SagaIterator ? ((...args: P) => Action<P>) : never;

// TODO: exclude non-effect method in ActionCreators
// tried:
//      type EffectKeys<H> = {[K in keyof H]: H[K] extends (...args: any[]) => SagaIterator ? K : never}[keyof H];
//      export type ActionCreators<H> = {readonly [K in Exclude<EffectKeys<H>, keyof Listener>]: ActionCreator<H[K]>}
// IntelliJ fails to infer the relationship between actions.methodName and methodName.

export type ActionCreators<H> = {readonly [K in Exclude<keyof H, keyof Handler<any> | keyof Listener>]: ActionCreator<H[K]>};

export function actionCreator<H extends Handler<any>>(handler: H): ActionCreators<H> {
    const actionCreators = {};

    keys(handler).forEach(actionType => {
        const qualifiedActionType = `${handler.namespace}/${actionType}`;
        actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
    });

    return actionCreators as ActionCreators<H>;
}

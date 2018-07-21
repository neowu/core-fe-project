import {Handler} from "../app";
import {Action, ActionCreators, HandlerMethod} from "../type";

export function actionCreator<S extends object, A extends Handler<S>>(handler: A): ActionCreators<A> {
    const actionCreators = {};

    const keys = [...Object.keys(Object.getPrototypeOf(handler)).filter(key => key !== "constructor"), "resetState"];
    keys.forEach(actionType => {
        const method: HandlerMethod<any> = handler[actionType];
        const qualifiedActionType = method.global ? actionType : `${handler.namespace}/${actionType}`;
        actionCreators[actionType] = (...payload: any[]): Action<any[]> => ({type: qualifiedActionType, payload});
    });

    return actionCreators as ActionCreators<A>;
}

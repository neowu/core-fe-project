import {LOCATION_CHANGE} from "connected-react-router";
import {SagaIterator} from "redux-saga";
import {ERROR_ACTION_TYPE} from "./error";

export type EffectHandler = (...args: any[]) => SagaIterator;

export class HandlerStore {
    readonly effects: {[actionType: string]: EffectHandler} = {};
    readonly listenerEffects: {[actionType: string]: EffectHandler[]} = {
        [LOCATION_CHANGE]: [],
        [ERROR_ACTION_TYPE]: [],
    };
}

import {LOCATION_CHANGE} from "connected-react-router";
import {SagaIterator} from "redux-saga";
import {ERROR_ACTION_TYPE} from "./exception";

export type ReducerHandler<S> = ((...args: any[]) => S) & {
    namespace: string;
};
export type EffectHandler = ((...args: any[]) => SagaIterator) & {
    loading?: string;
    appInitialized?: boolean;
};

export class HandlerStore {
    readonly reducers: {[actionType: string]: ReducerHandler<any>} = {};
    readonly effects: {[actionType: string]: EffectHandler} = {};
    readonly listenerEffects: {[actionType: string]: EffectHandler[]} = {
        [LOCATION_CHANGE]: [],
        [ERROR_ACTION_TYPE]: [],
    };
}

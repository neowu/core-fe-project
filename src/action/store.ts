import {SagaIterator} from "redux-saga";
import {Exception} from "../exception";
import {LocationChangedEvent} from "./listener";

export type ReducerHandler<S> = ((...args: any[]) => S) & {
    namespace: string;
};
export type EffectHandler = ((...args: any[]) => SagaIterator) & {
    loading?: string;
};
export type ErrorHandler = (error: Exception) => SagaIterator;
export type LocationChangeHandler = (event: LocationChangedEvent) => SagaIterator;

export class HandlerStore {
    readonly reducers: {[actionType: string]: ReducerHandler<any>} = {};
    readonly effects: {[actionType: string]: EffectHandler} = {};
    readonly onErrorEffects: ErrorHandler[] = [];
    readonly onLocationChangeEffects: LocationChangeHandler[] = [];
}

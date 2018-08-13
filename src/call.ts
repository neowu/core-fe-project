import {call as sagaCall, CallEffect} from "redux-saga/effects";

interface CallWithResultEffect<R> extends CallEffect {
    result: () => R;
}

export const call = <R, P extends any[]>(func: (...args: P) => Promise<R>, ...args: P) => {
    let result: R;
    const effect: CallWithResultEffect<R> = sagaCall.call(
        null,
        (...args: P) =>
            func(...args).then(value => {
                result = value;
                return result;
            }),
        ...args
    );
    effect.result = () => {
        if (result === undefined) {
            throw new Error("result is undefined, please yield effect before calling result()");
        }
        return result;
    };
    return effect;
};

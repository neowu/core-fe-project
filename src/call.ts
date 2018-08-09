import {call as sagaCall, CallEffect} from "redux-saga/effects";

interface CallWithResultEffect<R> extends CallEffect {
    result: () => R;
}

export const call = <R, P extends any[]>(func: (...args: P) => Promise<R>, ...args: P) => {
    let response: R;
    const callWithResultEffect: CallWithResultEffect<R> = sagaCall.call(
        null,
        (...args: P) =>
            func(...args).then(result => {
                response = result;
                return response;
            }),
        ...args
    );
    callWithResultEffect.result = () => {
        if (response === undefined) {
            throw new Error("response is undefined, please yield effect before calling response()");
        }
        return response;
    };
    return callWithResultEffect;
};

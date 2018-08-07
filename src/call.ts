import {call as sagaCall, CallEffect} from "redux-saga/effects";

interface CallWithResultEffect<R> extends CallEffect {
    result: () => R;
}

type CallWithResult = <R, P extends any[]>(fn: (...args: P) => Promise<R>, ...args: P) => CallWithResultEffect<R>;

export const call: CallWithResult = <R, P extends any[]>(func: (...args: P) => Promise<R>, ...args: P) => {
    let response: any;
    const effect: CallWithResultEffect<any> = sagaCall.call(
        null,
        (...args: P) =>
            func(...args).then(result => {
                response = result;
                return response;
            }),
        ...args
    );
    effect.result = () => {
        if (response === undefined) {
            throw new Error("response is undefined, please yield effect before calling response()");
        }
        return response;
    };
    return effect;
};

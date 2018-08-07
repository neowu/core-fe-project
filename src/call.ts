import {call, CallEffect} from "redux-saga/effects";

interface CallWithResultEffect<R> extends CallEffect {
    result: () => R;
}

type Function0<R> = () => Promise<R>;
type Function1<R, T1> = (arg1: T1) => Promise<R>;
type Function2<R, T1, T2> = (arg1: T1, arg2: T2) => Promise<R>;
type Function3<R, T1, T2, T3> = (arg1: T1, arg2: T2, arg3: T3) => Promise<R>;
type Function4<R, T1, T2, T3, T4> = (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<R>;

interface CallWithResult {
    <R>(fn: Function0<R>): CallWithResultEffect<R>;

    <R, T1, A1 extends T1>(fn: Function1<R, T1>, arg1: A1): CallWithResultEffect<R>;

    <R, T1, T2, A1 extends T1, A2 extends T2>(fn: Function2<R, T1, T2>, arg1: A1, arg2: A2): CallWithResultEffect<R>;

    <R, T1, T2, T3, A1 extends T1, A2 extends T2, A3 extends T3>(fn: Function3<R, T1, T2, T3>, arg1: A1, arg2: A2, arg3: A3): CallWithResultEffect<R>;

    <R, T1, T2, T3, T4, A1 extends T1, A2 extends T2, A3 extends T3, A4 extends T4>(fn: Function4<R, T1, T2, T3, T4>, arg1: A1, arg2: A2, arg3: A3, arg4: A4): CallWithResultEffect<R>;
}

export const callWithResult: CallWithResult = (func: (...args: any[]) => Promise<any>, ...args: any[]) => {
    let response: any;
    const effect: CallWithResultEffect<any> = call.call(
        null,
        (...args: any[]) =>
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

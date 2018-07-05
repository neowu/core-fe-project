import axios, {AxiosError, AxiosRequestConfig} from "axios";
import {call, CallEffect} from "redux-saga/effects";
import {Exception} from "./exception";

export class APIException extends Exception {
    constructor(message: string, public statusCode: number | null, public requestURL: string, public responseData: object | null) {
        super(message);
    }
}

function handleError(error: AxiosError) {
    const httpErrorCode = error.response ? error.response.status : 0;
    const responseData = error.response ? error.response.data : "";

    // try to get server errorMessage from response
    const errorMessage = responseData && responseData.message ? responseData.message : `failed to call ${error.config.url}`;
    throw new APIException(errorMessage, httpErrorCode, error.config.url!, responseData);
}

axios.interceptors.response.use(
    response => response,
    error => {
        handleError(error);
    }
);

const ISO_DATE_FORMAT = /^\d{4}-[01]\d-[0-3]\d(?:T[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d*)(?:Z|[\+-][\d|:]*)?)?$/;
const parser = (key: any, value: any) => {
    if (typeof value === "string" && ISO_DATE_FORMAT.test(value)) {
        return new Date(value);
    }
    return value;
};

export function json(data: string): object {
    return JSON.parse(data, parser);
}

axios.defaults.transformResponse = (data, headers) => {
    const contentType = headers["content-type"];
    if (contentType && contentType.startsWith("application/json")) {
        return json(data);
    }
    return data;
};

export function ajax<Request, Response>(method: string, path: string, pathParams: object, request: Request): Promise<Response> {
    const config: AxiosRequestConfig = {method, url: url(path, pathParams)};

    if (method === "GET" || method === "DELETE") {
        config.params = request;
    } else if (method === "POST" || method === "PUT" || method === "PATCH") {
        config.data = request;
    }

    return axios.request(config).then(response => response.data);
}

export function url(pattern: string, params: object): string {
    if (!params) {
        return pattern;
    }
    let url = pattern;
    Object.entries(params).forEach(([name, value]) => {
        const encodedValue = encodeURIComponent(value.toString());
        url = url.replace(":" + name, encodedValue);
    });
    return url;
}

interface CallAJAXEffect<R> extends CallEffect {
    response: () => R;
}

type Function0<R> = () => Promise<R>;
type Function1<R, T1> = (arg1: T1) => Promise<R>;
type Function2<R, T1, T2> = (arg1: T1, arg2: T2) => Promise<R>;
type Function3<R, T1, T2, T3> = (arg1: T1, arg2: T2, arg3: T3) => Promise<R>;
type Function4<R, T1, T2, T3, T4> = (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<R>;

interface CallAJAX {
    <R>(fn: Function0<R>): CallAJAXEffect<R>;

    <R, T1, A1 extends T1>(fn: Function1<R, T1>, arg1: A1): CallAJAXEffect<R>;

    <R, T1, T2, A1 extends T1, A2 extends T2>(fn: Function2<R, T1, T2>, arg1: A1, arg2: A2): CallAJAXEffect<R>;

    <R, T1, T2, T3, A1 extends T1, A2 extends T2, A3 extends T3>(fn: Function3<R, T1, T2, T3>, arg1: A1, arg2: A2, arg3: A3): CallAJAXEffect<R>;

    <R, T1, T2, T3, T4, A1 extends T1, A2 extends T2, A3 extends T3, A4 extends T4>(fn: Function4<R, T1, T2, T3, T4>, arg1: A1, arg2: A2, arg3: A3, arg4: A4): CallAJAXEffect<R>;
}

export const callAJAX: CallAJAX = (func: (...args: any[]) => Promise<any>, ...args: any[]) => {
    let response: any;
    const effect: CallAJAXEffect<any> = call.call(
        null,
        (...args: any[]) =>
            func(...args).then(result => {
                response = result;
                return response;
            }),
        ...args
    );
    effect.response = () => {
        if (response === undefined) {
            throw new Error("response is undefined, please yield effect before calling response()");
        }
        return response;
    };
    return effect;
};

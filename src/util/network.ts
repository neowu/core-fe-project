import axios, {AxiosError, AxiosRequestConfig, Method} from "axios";
import {APIException, NetworkConnectionException} from "../Exception";
import {parseWithDate} from "./json-util";

type HeaderMap = {[key: string]: string};
type RequestHeaderInterceptor = (headers: HeaderMap) => void | Promise<void>;
type ResponseHeaderInterceptor = (headers: Readonly<HeaderMap>) => void | Promise<void>;

const networkInterceptor: {request?: RequestHeaderInterceptor; response?: ResponseHeaderInterceptor} = {};

export function setRequestHeaderInterceptor(_: RequestHeaderInterceptor) {
    networkInterceptor.request = _;
}

export function setResponseHeaderInterceptor(_: ResponseHeaderInterceptor) {
    networkInterceptor.response = _;
}

axios.defaults.transformResponse = (data, headers) => {
    const contentType = headers["content-type"];
    if (contentType && contentType.startsWith("application/json")) {
        return parseWithDate(data);
    }
    return data;
};

axios.interceptors.response.use(
    response => response,
    e => {
        // eslint-disable-next-line no-prototype-builtins
        if (e && typeof e === "object" && e.hasOwnProperty("isAxiosError")) {
            const error = e as AxiosError;
            const requestURL = error.config.url || "-";
            if (error.response) {
                // Try to get server error message/ID/code from response
                const responseData = error.response.data;
                const errorId: string | null = responseData && responseData.id ? responseData.id : null;
                const errorCode: string | null = responseData && responseData.errorCode ? responseData.errorCode : null;

                if (!errorId && (error.response.status === 502 || error.response.status === 504)) {
                    // Treat "cloud" error as Network Exception, e.g: gateway issue, load balancer unconnected to application server
                    // Note: Status 503 is maintenance
                    throw new NetworkConnectionException(`gateway error (${error.response.status})`, requestURL, error.message);
                } else {
                    const errorMessage: string = responseData && responseData.message ? responseData.message : `[No response message]`;
                    throw new APIException(errorMessage, error.response.status, requestURL, responseData, errorId, errorCode);
                }
            } else {
                /**
                 * It could be network failure, or CORS pre-flight failure. We cannot distinguish here.
                 * Ref: https://github.com/axios/axios/issues/838
                 */
                throw new NetworkConnectionException(`failed to connect to ${requestURL}`, requestURL, error.message);
            }
        } else {
            throw new NetworkConnectionException(`unknown network error`, `[No URL retrieved]`, e.toString());
        }
    }
);

export async function ajax<Request, Response>(method: Method, path: string, pathParams: object, request: Request): Promise<Response> {
    const fullURL = urlParams(path, pathParams);
    const config: AxiosRequestConfig = {method, url: fullURL};

    if (method === "GET" || method === "DELETE") {
        config.params = request;
    } else if (method === "POST" || method === "PUT" || method === "PATCH") {
        config.data = request;
    }

    const requestHeaderMap: HeaderMap = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    if (networkInterceptor.request) {
        await networkInterceptor.request(requestHeaderMap);
    }
    config.headers = requestHeaderMap;

    const response = await axios.request(config);
    const responseHeaderMap: HeaderMap = response.headers;
    if (networkInterceptor.response) {
        await networkInterceptor.response(responseHeaderMap);
    }
    return response.data;
}

export function uri<Request>(path: string, request: Request): string {
    const config: AxiosRequestConfig = {method: "GET", url: path, params: request};
    return axios.getUri(config);
}

export function urlParams(pattern: string, params: object): string {
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

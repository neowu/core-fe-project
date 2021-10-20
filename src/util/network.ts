import axios, {AxiosError, AxiosRequestConfig, Method} from "axios";
import {APIException, NetworkConnectionException} from "../Exception";
import {parseWithDate} from "./json-util";

export type PathParams<T extends string> = string extends T ? {[key: string]: string | number} : T extends `${infer Start}:${infer Param}/${infer Rest}` ? {[k in Param | keyof PathParams<Rest>]: string | number} : T extends `${infer Start}:${infer Param}` ? {[k in Param]: string | number} : {};

export interface APIErrorResponse {
    id?: string | null;
    errorCode?: string | null;
    message?: string | null;
}

axios.defaults.transformResponse = (data, headers) => {
    const contentType = headers?.["content-type"];
    if (contentType?.startsWith("application/json")) {
        return parseWithDate(data);
    }
    return data;
};

axios.interceptors.response.use(
    (response) => response,
    (e) => {
        if (axios.isAxiosError(e)) {
            const error = e as AxiosError<APIErrorResponse | undefined>;
            const requestURL = error.config.url || "-";
            if (error.response) {
                // Try to get server error message/ID/code from response
                const responseData = error.response.data;
                const errorId: string | null = responseData?.id || null;
                const errorCode: string | null = responseData?.errorCode || null;

                if (!errorId && (error.response.status === 502 || error.response.status === 504)) {
                    // Treat "cloud" error as Network Exception, e.g: gateway issue, load balancer unconnected to application server
                    // Note: Status 503 is maintenance
                    throw new NetworkConnectionException(`Gateway error (${error.response.status})`, requestURL, error.message);
                } else {
                    const errorMessage: string = responseData && responseData.message ? responseData.message : `[No Response]`;
                    throw new APIException(errorMessage, error.response.status, requestURL, responseData, errorId, errorCode);
                }
            } else {
                /**
                 * It could be network failure, or CORS pre-flight failure. We cannot distinguish here.
                 * Ref: https://github.com/axios/axios/issues/838
                 */
                throw new NetworkConnectionException(`Failed to connect: ${requestURL}`, requestURL, error.message);
            }
        } else {
            throw new NetworkConnectionException(`Unknown network error`, `[No URL]`, e.toString());
        }
    }
);

export async function ajax<Request, Response, Path extends string>(method: Method, path: Path, pathParams: PathParams<Path>, request: Request, extraConfig: Partial<AxiosRequestConfig> = {}): Promise<Response> {
    const fullURL = urlParams(path, pathParams);
    const config: AxiosRequestConfig = {...extraConfig, method, url: fullURL};

    if (method === "GET" || method === "DELETE") {
        config.params = request;
    } else if (method === "POST" || method === "PUT" || method === "PATCH") {
        config.data = request;
    }

    config.headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };

    const response = await axios.request<Response>(config);
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

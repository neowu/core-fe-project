import axios, {AxiosError, AxiosRequestConfig, Method} from "axios";
import {APIException, NetworkConnectionException} from "../Exception";
import {parseWithDate} from "./json-util";

export type PathParams<T extends string> = string extends T ? {[key: string]: string | number} : T extends `${infer Start}:${infer Param}/${infer Rest}` ? {[k in Param | keyof PathParams<Rest>]: string | number} : T extends `${infer Start}:${infer Param}` ? {[k in Param]: string | number} : {};

export interface APIErrorResponse {
    id?: string | null;
    errorCode?: string | null;
    message?: string | null;
}

const ajaxClient = axios.create({
    transformResponse: (data, headers) => {
        if (data) {
            // API response may be void, in such case, JSON.parse will throw error
            const contentType = headers?.["content-type"];
            if (contentType?.startsWith("application/json")) {
                return parseWithDate(data);
            } else {
                throw new NetworkConnectionException("ajax() response not in JSON format", "");
            }
        } else {
            return data;
        }
    },
});

ajaxClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error)) {
            const typedError = error as AxiosError<APIErrorResponse | undefined>;
            const requestURL = typedError.config?.url || "-";

            if (typedError.response) {
                const responseData = typedError.response.data;
                // Treat "cloud" error as Network Exception, e.g: gateway/load balancer issue
                const networkErrorStatusCodes: number[] = [0, 502, 504];
                if (responseData && !networkErrorStatusCodes.includes(typedError.response.status)) {
                    // Try to get server error message/ID/code from response
                    const errorId: string | null = responseData?.id || null;
                    const errorCode: string | null = responseData?.errorCode || null;
                    const errorMessage: string = responseData.message || `[No Response]`;
                    throw new APIException(errorMessage, typedError.response.status, requestURL, responseData, errorId, errorCode);
                }
            }

            throw new NetworkConnectionException(`Failed to connect: ${requestURL}`, requestURL, `${typedError.code || "UNKNOWN"}: ${typedError.message}`);
        } else if (error instanceof NetworkConnectionException) {
            throw error;
        } else {
            throw new NetworkConnectionException(`Unknown network error`, `[No URL]`, error.toString());
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

    const response = await ajaxClient.request<Response>(config);
    return response.data;
}

export function uri<Request>(path: string, request: Request): string {
    const config: AxiosRequestConfig = {method: "GET", url: path, params: request};
    return ajaxClient.getUri(config);
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

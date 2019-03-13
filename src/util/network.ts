import axios, {AxiosError, AxiosRequestConfig} from "axios";
import {APIException, NetworkConnectionException} from "../Exception";

axios.defaults.transformResponse = (data, headers) => {
    const contentType = headers["content-type"];
    if (contentType && contentType.startsWith("application/json")) {
        return json(data);
    }
    return data;
};

axios.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
        const url = error.config.url!;
        if (error.response) {
            // Try to get server errorMessage from response
            const responseData = error.response.data;
            const errorMessage = responseData && responseData.message ? responseData.message : `failed to call ${error.config.url}`;
            throw new APIException(errorMessage, error.response.status, url, responseData);
        } else {
            throw new NetworkConnectionException(url);
        }
    }
);

export function json(data: string) {
    // ISO format (supported by Java ZonedDateTime)
    const ISO_DATE_FORMAT = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-][01]\d:[0-5]\d)$/;
    return JSON.parse(data, (key: any, value: any) => {
        if (typeof value === "string" && ISO_DATE_FORMAT.test(value)) {
            return new Date(value);
        }
        return value;
    });
}

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

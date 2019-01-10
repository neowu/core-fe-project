import axios, {AxiosError, AxiosRequestConfig} from "axios";
import {Exception} from "./exception";

export class APIException extends Exception {
    constructor(message: string, public statusCode: number | null, public requestURL: string, public responseData: object | null) {
        super(message);
    }
}

export class APIErrorMessageException extends Exception {
    constructor(message: string, public responseData: object) {
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

const ISO_DATE_FORMAT = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-][01]\d:[0-5]\d)$/; // ISO format (supported by Java ZonedDateTime)
const parser = (key: any, value: any) => {
    if (typeof value === "string" && ISO_DATE_FORMAT.test(value)) {
        return new Date(value);
    }
    return value;
};

export function json(data: string) {
    return JSON.parse(data, parser);
}

axios.defaults.transformResponse = (data, headers) => {
    const contentType = headers["content-type"];
    if (contentType && contentType.startsWith("application/json")) {
        // TODO: this is a step backward, because it introduces parallel break mechanism to skip current flow
        //  the reason server returns 200+success=false is only when client wants to do something if it failed, e.g. highlight error input w/ message or do something else
        //  if client wants to break, we should throw exception on server side in first place, it will make both client and server simpler and achieve same goal
        const jsonData = json(data);
        if (jsonData.success === false && typeof jsonData.errorMessage === "string") {
            throw new APIErrorMessageException(jsonData.errorMessage, jsonData);
        }
        return jsonData;
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

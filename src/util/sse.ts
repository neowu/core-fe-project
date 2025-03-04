import {ErrorEvent, EventSource} from "eventsource";
import {app} from "../app";
import {parseWithDate} from "./json-util";
import type {Method} from "axios";
import {NetworkConnectionException} from "../Exception";
import {errorToException} from "./error-util";

export interface SSEConfig<Request> {
    actionPrefix: string;
    url: string;
    method?: Method;
    payload?: Request;
    logResponse?: boolean;
}

type Unsubscriber = () => void;
type ConnectedListener = (connectedTimes: number) => void;
type ErrorListener = (error: ErrorEvent) => void;

// Register your listeners before calling connect()
export interface SSEHandler<Response extends Record<string, any>> {
    connect: () => Promise<void>;
    disconnect: () => void;
    onConnected: (listener: ConnectedListener) => Unsubscriber;
    onError: (subscriber: ErrorListener) => Unsubscriber;
    onResponse: <E extends keyof Response>(event: E, listener: (data: NonNullable<Response[E]>) => void) => Unsubscriber;
}

export function sse<Request, Response extends Record<string, any>>({
    // prettier
    actionPrefix,
    url,
    method = "GET",
    payload,
    logResponse = false,
}: SSEConfig<Request>): SSEHandler<Response> {
    let eventSource: EventSource | null = null;
    let startTime: number | null = Date.now();
    let connectingTimes: number = 1;

    const connectedListeners: Array<ConnectedListener> = [];
    const errorListeners: Array<ErrorListener> = [];
    const messageListeners: Map<keyof Response, Array<(data: NonNullable<Response[keyof Response]>) => void>> = new Map();

    const generalMessageListener = (e: MessageEvent) => {
        const originalData = e.data as string;
        const data = parseWithDate(e.data) as Response;
        if (logResponse) {
            app.logger.info({
                action: `${actionPrefix}/@@SSE_RESPONSE`,
                context: {sse_url: url},
                info: {data: originalData},
            });
        }

        const validMessageFields = Object.keys(data).filter(_ => data[_] !== null) as (keyof Response)[];
        validMessageFields.forEach(field => messageListeners.get(field)?.forEach(listener => listener(data[field])));
    };
    const generalErrorListener = (e: ErrorEvent) => {
        app.logger.warn({
            action: `${actionPrefix}/@@SSE_ERROR`,
            errorCode: "SSE_ERROR",
            errorMessage: errorToException(e).message,
            context: {sse_url: url},
        });
        errorListeners.forEach(listener => listener(e));
        startTime = Date.now(); // reset startTime for next connection
    };

    return {
        connect: async () => {
            const sseState = eventSource?.readyState;
            if (sseState === EventSource.CONNECTING || sseState === EventSource.OPEN) return;

            return new Promise<void>((resolve, reject) => {
                eventSource = new EventSource(url, {
                    fetch: (input, init) =>
                        fetch(input, {
                            ...init,
                            method,
                            body: payload ? JSON.stringify(payload) : null,
                            headers: {...init?.headers, "content-type": "application/json"},
                        }),
                });

                eventSource.onopen = e => {
                    app.logger.info({
                        action: `${actionPrefix}/@@SSE_CONNECTED`,
                        context: {sse_url: url},
                        stats: {connecting_times: connectingTimes},
                        elapsedTime: startTime ? Date.now() - startTime : undefined,
                    });

                    // onopen callback may be called many times by EventSource auto-retry
                    // only log `elapsedTime` for first connection
                    startTime = null;
                    connectingTimes++;

                    eventSource!.onerror = null;
                    eventSource!.addEventListener("message", generalMessageListener);
                    eventSource!.addEventListener("error", generalErrorListener);

                    connectedListeners.forEach(listener => listener(connectingTimes));
                    resolve();
                };

                // for create connection error
                eventSource.onerror = e => {
                    eventSource!.onopen = null;
                    eventSource!.onerror = null;
                    eventSource!.close();
                    reject(new NetworkConnectionException(`Failed to connect SSE: ${url}`, url, `${e.code || "UNKNOWN"}: ${e.message}`));
                };
            });
        },
        disconnect: () => {
            connectedListeners.splice(0, connectedListeners.length);
            errorListeners.splice(0, errorListeners.length);
            messageListeners.clear();

            if (eventSource) {
                eventSource.onopen = null;
                eventSource.removeEventListener("message", generalMessageListener);
                eventSource.removeEventListener("error", generalErrorListener);
                eventSource.close();
                eventSource = null;
            }
        },
        onConnected: listener => {
            connectedListeners.push(listener);
            return () => {
                const index = connectedListeners.indexOf(listener);
                if (index !== -1) connectedListeners.splice(index, 1);
            };
        },
        onError: listener => {
            errorListeners.push(listener);
            return () => {
                const index = errorListeners.indexOf(listener);
                if (index !== -1) errorListeners.splice(index, 1);
            };
        },
        onResponse: (event, listener) => {
            const listeners = messageListeners.get(event);
            if (!listeners) {
                messageListeners.set(event, [listener]);
            } else {
                listeners.push(listener);
            }
            return () => {
                const listeners = messageListeners.get(event);
                if (!listeners) return;

                const index = listeners.indexOf(listener);
                if (index !== -1) listeners.splice(index, 1);
            };
        },
    };
}

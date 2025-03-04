import {ErrorEvent, EventSource} from "eventsource";
import {app} from "../app";
import {parseWithDate} from "./json-util";
import type {Method} from "axios";
import {NetworkConnectionException} from "../Exception";
import {errorToException} from "./error-util";
import {uuid} from "./uuid";

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

// Register listeners before calling connect()
export interface SSE<Response extends Record<string, any>> {
    connect: () => Promise<void>;
    disconnect: () => void;
    onConnected: (listener: ConnectedListener) => Unsubscriber;
    onError: (listener: ErrorListener) => Unsubscriber;
    onResponse: <E extends keyof Response>(event: E, listener: (data: NonNullable<Response[E]>) => void) => Unsubscriber;
}

export function sse<Request, Response extends Record<string, any>>({
    // prettier
    actionPrefix,
    url,
    method = "GET",
    payload,
    logResponse = false,
}: SSEConfig<Request>): SSE<Response> {
    let eventSource: EventSource | null = null;
    let startTime: number | null = null;
    let connectingTimes: number = 1;
    let traceId: string | null = null;

    const connectedListeners: Array<ConnectedListener> = [];
    const errorListeners: Array<ErrorListener> = [];
    const messageListeners: Map<keyof Response, Array<(data: NonNullable<Response[keyof Response]>) => void>> = new Map();

    const generalMessageListener = (e: MessageEvent) => {
        const data = parseWithDate(e.data) as Response;

        const validMessageFields = Object.keys(data).filter(_ => data[_] !== null) as (keyof Response)[];
        if (validMessageFields.length > 0) {
            validMessageFields.forEach(field => messageListeners.get(field)?.forEach(listener => listener(data[field])));

            if (logResponse) {
                app.logger.info({
                    action: `${actionPrefix}/@@SSE_RESPONSE`,
                    context: {sse_url: url},
                    info: {message: validMessageFields.map(field => `${field.toString()}:${JSON.stringify(data[field])}`).join(`\n`)},
                });
            }
        }
    };
    const generalErrorListener = (e: ErrorEvent) => {
        app.logger.warn({
            action: `${actionPrefix}/@@SSE_ERROR`,
            errorCode: "SSE_ERROR",
            errorMessage: errorToException(e).message,
            context: {sse_url: url},
            info: {trace_id: traceId || undefined},
        });
        errorListeners.forEach(listener => listener(e));
        startTime = Date.now(); // reset startTime for next connection
    };

    return {
        connect: async () => {
            const sseState = eventSource?.readyState;
            if (sseState === EventSource.CONNECTING || sseState === EventSource.OPEN) return;

            startTime = Date.now();
            traceId = uuid();

            return new Promise<void>((resolve, reject) => {
                eventSource = new EventSource(url, {
                    fetch: (input, init) =>
                        fetch(input, {
                            ...init,
                            method,
                            body: payload ? JSON.stringify(payload) : null,
                            headers: {
                                ...init?.headers,
                                "x-trace-id": traceId!,
                                "content-type": "application/json",
                            },
                        }),
                });

                eventSource.onopen = e => {
                    app.logger.info({
                        action: `${actionPrefix}/@@SSE_CONNECTED`,
                        context: {sse_url: url},
                        info: {trace_id: traceId || undefined},
                        stats: {connecting_times: connectingTimes},
                        elapsedTime: startTime ? Date.now() - startTime : undefined,
                    });

                    // onopen callback may be called many times by EventSource auto-retry
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

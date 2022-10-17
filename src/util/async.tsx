import React from "react";
import {app, logger} from "../app";
import {loadingAction} from "../reducer";
import {captureError, errorToException} from "./error-util";

type ReactComponentKeyOf<T> = {[P in keyof T]: T[P] extends React.ComponentType<any> ? P : never}[keyof T];

export interface AsyncOptions {
    loadingIdentifier?: string;
    LoadingComponent?: React.ComponentType;
    ErrorComponent?: React.ComponentType<AsyncErrorComponentProps>;
}

export interface AsyncErrorComponentProps {
    error: unknown;
    reload: () => Promise<void>;
}

interface WrapperComponentState {
    Component: React.ComponentType<any> | null;
    error: unknown | null;
}

const ASYNC_LOAD_ACTION = "@@framework/async-import";

export function async<T, K extends ReactComponentKeyOf<T>>(resolve: () => Promise<T>, component: K, {LoadingComponent, loadingIdentifier, ErrorComponent}: AsyncOptions = {}): T[K] {
    return class AsyncWrapperComponent extends React.PureComponent<{}, WrapperComponentState> {
        constructor(props: {}) {
            super(props);
            this.state = {Component: null, error: null};
        }

        override componentDidMount() {
            this.loadComponentWithAutoRetry(2);
        }

        loadComponentWithAutoRetry = async (maxRetryTime: number) => {
            let retryTime = 0;

            const loadChunk = async () => {
                const startTime = Date.now();
                try {
                    const moduleExports = await resolve();
                    this.setState({Component: moduleExports[component] as any});
                } catch (e) {
                    if (retryTime++ < maxRetryTime) {
                        logger.warn({
                            action: ASYNC_LOAD_ACTION,
                            elapsedTime: Date.now() - startTime,
                            errorCode: "LOAD_CHUNK_FAILURE_RETRY",
                            errorMessage: errorToException(e).message,
                            info: {retry_time: retryTime.toString()},
                        });
                        await loadChunk();
                    } else {
                        throw e;
                    }
                }
            };

            try {
                this.setState({error: null});
                app.store.dispatch(loadingAction(true, loadingIdentifier));
                await loadChunk();
            } catch (e) {
                captureError(e, ASYNC_LOAD_ACTION);
                this.setState({error: e});
            } finally {
                app.store.dispatch(loadingAction(false, loadingIdentifier));
            }
        };

        loadComponent = async () => this.loadComponentWithAutoRetry(0);

        override render() {
            const {Component, error} = this.state;
            const hasError = error !== null;

            if (hasError) {
                return ErrorComponent ? <ErrorComponent error={error} reload={this.loadComponent} /> : null;
            }

            return Component ? <Component {...this.props} /> : LoadingComponent ? <LoadingComponent /> : null;
        }
    } as any;
}

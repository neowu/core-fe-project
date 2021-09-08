import React from "react";
import {app} from "../app";
import {loadingAction} from "../reducer";

type ReactComponentKeyOf<T> = {[P in keyof T]: T[P] extends React.ComponentType<any> ? P : never}[keyof T];

interface AsyncOptions {
    loadingIdentifier?: string;
    LoadingComponent?: React.ComponentType;
    ErrorComponent?: React.ComponentType<ErrorComponentProps>;
}

interface WrapperComponentState {
    Component: React.ComponentType<any> | null;
    error: unknown | null;
}

export interface ErrorComponentProps {
    error: unknown;
    reload: () => Promise<void>;
}

export function async<T, K extends ReactComponentKeyOf<T>>(resolve: () => Promise<T>, component: K, {LoadingComponent, loadingIdentifier, ErrorComponent}: AsyncOptions = {}): T[K] {
    return class AsyncWrapperComponent extends React.PureComponent<{}, WrapperComponentState> {
        constructor(props: {}) {
            super(props);
            this.state = {Component: null, error: null};
        }

        override componentDidMount() {
            this.loadComponent();
        }

        async loadComponent() {
            try {
                this.setState({error: null});
                app.store.dispatch(loadingAction(true, loadingIdentifier));
                const moduleExports = await resolve();
                this.setState({Component: moduleExports[component]});
            } catch (e) {
                this.setState({error: e});
            } finally {
                app.store.dispatch(loadingAction(false, loadingIdentifier));
            }
        }

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

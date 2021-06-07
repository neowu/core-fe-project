import React from "react";
import {app} from "../app";
import {loadingAction} from "../reducer";

type ReactComponentKeyOf<T> = {[P in keyof T]: T[P] extends React.ComponentType<any> ? P : never}[keyof T];

interface AsyncOptions {
    loadingComponent?: React.ReactElement;
    loadingIdentifier?: string;
}

interface WrapperComponentState {
    Component: React.ComponentType<any> | null;
}

export function async<T, K extends ReactComponentKeyOf<T>>(resolve: () => Promise<T>, component: K, {loadingComponent, loadingIdentifier}: AsyncOptions = {}): T[K] {
    return class AsyncWrapperComponent extends React.PureComponent<{}, WrapperComponentState> {
        constructor(props: {}) {
            super(props);
            this.state = {Component: null};
        }

        override async componentDidMount() {
            try {
                app.store.dispatch(loadingAction(true, loadingIdentifier));
                const moduleExports = await resolve();
                this.setState({Component: moduleExports[component]});
            } finally {
                app.store.dispatch(loadingAction(false, loadingIdentifier));
            }
        }

        override render() {
            const {Component} = this.state;
            return Component ? <Component {...this.props} /> : loadingComponent || null;
        }
    } as any;
}

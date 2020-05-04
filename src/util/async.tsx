import React from "react";
import {app} from "../app";
import {loadingAction} from "../reducer";

type ReactComponentKeyOf<T> = {[P in keyof T]: T[P] extends React.ComponentType<any> ? P : never}[keyof T];

export function async<T, K extends ReactComponentKeyOf<T>>(resolve: () => Promise<T>, component: K, loadingComponent: React.ReactElement | null = null): T[K] {
    interface State {
        Component: React.ComponentType<any> | null;
    }

    return class AsyncWrapperComponent extends React.PureComponent<{}, State> {
        state: State = {
            Component: null,
        };

        async componentDidMount() {
            try {
                app.store.dispatch(loadingAction(true));
                const moduleExports = await resolve();
                this.setState({Component: moduleExports[component]});
            } finally {
                app.store.dispatch(loadingAction(false));
            }
        }

        render() {
            const {Component} = this.state;
            return Component ? <Component {...this.props} /> : loadingComponent;
        }
    } as any;
}

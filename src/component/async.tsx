import React from "react";

export function async<T extends {[K in keyof T]: React.ComponentType}>(resolve: () => Promise<T>, component: keyof T, loadingComponent: React.ReactNode = null): React.ComponentType<any> {
    interface State {
        Component: React.ComponentType<any> | null;
    }

    class Component extends React.PureComponent<{}, State> {
        state: State = {
            Component: null,
        };

        componentDidMount() {
            const promise = resolve();
            promise.then(module => {
                this.setState({Component: module[component]});
            });
        }

        render() {
            const {Component} = this.state;
            return Component ? <Component /> : loadingComponent;
        }
    }

    return Component;
}

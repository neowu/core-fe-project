import React from "react";

interface State {
    Component: React.ComponentType<any> | null;
}

export function asyncComponent(resolve: () => Promise<React.ComponentType<any>>, LoadingComponent: React.ComponentType<any> = () => <div />): React.ComponentType<{}> {
    class Async extends React.PureComponent<{}, State> {
        state: State = {
            Component: null,
        };

        componentDidMount() {
            const promise = resolve();
            promise.then(Component => {
                this.setState({Component});
            });
        }

        render() {
            const {Component} = this.state;
            return Component ? <Component /> : <LoadingComponent />;
        }
    }

    return Async;
}

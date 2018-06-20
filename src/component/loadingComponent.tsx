import React from "react";
import {connect} from "react-redux";
import {State} from "../state";

interface Props {
    show: boolean;
}

export function loadingComponent(loading: string, Component: React.ComponentType<any>, LoadingComponent: React.ComponentType<any> = () => <div>loading...</div>): React.ComponentType<any> {
    class Loading extends React.PureComponent<Props> {
        render() {
            const {show} = this.props;
            return show ? <LoadingComponent /> : <Component />;
        }
    }

    return connect((state: State) => {
        const show = state.loading[loading] > 0;
        return {show};
    })(Loading);
}

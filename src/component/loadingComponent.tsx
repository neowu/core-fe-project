import React from "react";
import {connect} from "react-redux";
import {showLoading} from "../loading";
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
        const show = showLoading(state.loading, loading);
        return {show};
    })(Loading);
}

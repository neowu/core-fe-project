import React from "react";
import {connect} from "react-redux";
import {State} from "../state";

interface StateProps {
    showLoadingComponent: boolean;
}

interface OwnProps {
    identifier: string;
    loadingComponent?: React.ReactNode;
}

interface Props extends StateProps, OwnProps {}

class Component extends React.PureComponent<Props> {
    render() {
        const {showLoadingComponent, loadingComponent} = this.props;
        if (showLoadingComponent) {
            return loadingComponent || null;
        }
        return this.props.children || null;
    }
}

const mapStateToProps = (state: State, props: OwnProps): StateProps => ({
    showLoadingComponent: state.loading[props.identifier] > 0,
});

export const Loading = connect(mapStateToProps)(Component);

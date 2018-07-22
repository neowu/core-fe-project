import React from "react";
import {connect} from "react-redux";
import {State} from "../state";
import {showLoading} from "../action/loading";

interface OwnProps {
    loading: string;
    loadingComponent?: React.ReactNode;
    render?: ((props: Props) => React.ReactNode);
}

interface Props extends OwnProps {
    show: boolean;
}

class Component extends React.PureComponent<Props> {
    render() {
        const {show, loadingComponent, render} = this.props;
        if (render) {
            return render(this.props);
        }
        if (show) {
            return loadingComponent ? loadingComponent : null;
        }
        return this.props.children;
    }
}

const mapStateToProps = (state: State, props: OwnProps) => ({
    show: showLoading(state.loading, props.loading),
});

export const Loading = connect(mapStateToProps)(Component);

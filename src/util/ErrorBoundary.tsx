import React from "react";
import {connect, DispatchProp} from "react-redux";
import {RouteComponentProps, withRouter} from "react-router";
import {ReactLifecycleException} from "../Exception";
import {errorAction} from "../reducer";

interface OwnProps {
    render: (exception: ReactLifecycleException) => React.ReactNode;
    children: React.ReactNode;
}

interface Props extends OwnProps, DispatchProp, RouteComponentProps {}

interface State {
    exception: ReactLifecycleException | null;
}

class ErrorBoundary extends React.PureComponent<Props, State> {
    static defaultProps: Pick<Props, "render"> = {render: () => null};
    state: State = {exception: null};

    componentDidUpdate(prevProps: Readonly<Props>) {
        if (prevProps.location !== this.props.location && this.state.exception !== null) {
            this.setState({exception: null});
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const exception = new ReactLifecycleException(error.name + ": " + error.message, errorInfo.componentStack);
        this.props.dispatch(errorAction(exception));
        this.setState({exception});
    }

    render() {
        return this.state.exception ? this.props.render(this.state.exception) : this.props.children;
    }
}

export default withRouter(connect()(ErrorBoundary));

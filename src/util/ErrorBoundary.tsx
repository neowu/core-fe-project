import React from "react";
import {connect, DispatchProp} from "react-redux";
import {ReactLifecycleException} from "../Exception";
import {errorAction} from "../reducer";

interface OwnProps {
    render: (exception: ReactLifecycleException) => React.ReactNode;
    children: React.ReactNode;
}

interface Props extends OwnProps, DispatchProp {}

interface State {
    exception: ReactLifecycleException | null;
}

class Component extends React.PureComponent<Props, State> {
    static defaultProps: Pick<Props, "render"> = {render: () => null};
    state: State = {exception: null};

    componentDidUpdate(prevProps: Props) {
        // Support page recovery
        if (this.props.children !== prevProps.children) {
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

export const ErrorBoundary = connect()(Component);

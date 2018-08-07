import React from "react";
import {connect, DispatchProp} from "react-redux";
import {errorAction} from "../action/error";
import {Exception} from "../exception";

export class ReactLifecycleException extends Exception {
    constructor(public message: string, public stack: string | null, public componentStack: string) {
        super(message);
    }
}

interface Props extends DispatchProp<any> {
    render?: (exception: ReactLifecycleException) => React.ReactNode;
    children: React.ReactNode;
}

interface State {
    exception?: ReactLifecycleException;
}

class Component extends React.PureComponent<Props, State> {
    static defaultProps: Pick<Props, "render"> = {
        render: exception => <h2>render failed: {exception.message}</h2>,
    };
    state: State = {};

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const exception = new ReactLifecycleException(error.message, error.stack!, errorInfo.componentStack);
        this.props.dispatch(errorAction(exception));
        this.setState({exception});
    }

    render() {
        return this.state.exception ? this.props.render!(this.state.exception) : this.props.children;
    }
}

export const ErrorBoundary = connect()(Component);

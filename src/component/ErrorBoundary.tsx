import React, {ErrorInfo, ReactNode} from "react";
import {connect, DispatchProp} from "react-redux";
import {errorAction, Exception} from "../exception";

export class ReactException implements Exception {
    constructor(public message: string, public stack: string, public componentStack: string) {}
}

interface Props extends DispatchProp<any> {
    children: ReactNode;
}

interface State {
    errorMessage: string;
}

class ErrorBoundary extends React.PureComponent<Props, State> {
    state: State = {
        errorMessage: "",
    };

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({errorMessage: error.message});
        this.props.dispatch(errorAction(new ReactException(error.message, error.stack, errorInfo.componentStack)));
    }

    render() {
        if (this.state.errorMessage) {
            return <div>failed to render, error: {this.state.errorMessage}</div>;
        }
        return this.props.children;
    }
}

export default connect()(ErrorBoundary);

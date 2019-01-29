import React from "react";
import {connect, DispatchProp} from "react-redux";
import {Exception} from "../exception";
import {errorAction} from "../reducer";

export class ReactLifecycleException extends Exception {
    constructor(public message: string, public stack: string | null, public componentStack: string) {
        super(message);
    }
}

interface Props extends DispatchProp<any> {
    render: (exception: ReactLifecycleException) => React.ReactNode;
    children: React.ReactNode;
}

interface State {
    exception: ReactLifecycleException | null;
}

class Component extends React.PureComponent<Props, State> {
    static defaultProps: Pick<Props, "render"> = {render: exception => <h2>render failed: {exception.message}</h2>};
    state: State = {exception: null};

    componentDidUpdate(prevProps: Props) {
        // Support page recovery
        if (this.props.children !== prevProps.children) {
            this.setState({exception: null});
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        if (process.env.NODE_ENV === "development") {
            console.error("React Lifecycle Error");
            console.error(error);
            console.error("Stack", errorInfo.componentStack);
        }

        const exception = new ReactLifecycleException(error.message, error.stack!, errorInfo.componentStack);
        this.props.dispatch(errorAction(exception));
        this.setState({exception});
    }

    render() {
        return this.state.exception ? this.props.render(this.state.exception) : this.props.children;
    }
}

export const ErrorBoundary = connect()(Component);

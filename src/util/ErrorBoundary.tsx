import React from "react";
import {Exception} from "../Exception";
import {captureError} from "./error-util";

interface Props {
    render: (exception: Exception) => React.ReactNode;
    children: React.ReactNode;
}

interface State {
    exception: Exception | null;
}

export default class ErrorBoundary extends React.PureComponent<Props, State> {
    static displayName = "ErrorBoundary";
    static defaultProps: Pick<Props, "render"> = {render: () => null};

    constructor(props: Props) {
        super(props);
        this.state = {exception: null};
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const exception = captureError(error, "@@framework/error-boundary", {extraStacktrace: errorInfo.componentStack});
        this.setState({exception});
    }

    render() {
        return this.state.exception ? this.props.render(this.state.exception) : this.props.children || null;
    }
}

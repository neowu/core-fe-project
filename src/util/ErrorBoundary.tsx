import React from "react";
import {Exception} from "../Exception";
import {captureError} from "./error-util";

interface Props {
    render: (exception: Exception) => React.ReactElement | null;
    children: React.ReactNode;
}

interface State {
    exception: Exception | null;
}

export class ErrorBoundary extends React.PureComponent<Props, State> {
    static displayName = "ErrorBoundary";
    static defaultProps: Pick<Props, "render"> = {render: () => null};

    constructor(props: Props) {
        super(props);
        this.state = {exception: null};
    }

    override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const exception = captureError(error, "@@framework/error-boundary", errorInfo.componentStack ? {extraStacktrace: errorInfo.componentStack} : undefined);
        this.setState({exception});
    }

    override render() {
        return this.state.exception ? this.props.render(this.state.exception) : this.props.children || null;
    }
}

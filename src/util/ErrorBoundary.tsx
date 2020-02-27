import React from "react";
import {connect, DispatchProp} from "react-redux";
import {JavaScriptException} from "../Exception";
import {SentryHelper} from "../SentryHelper";

interface OwnProps {
    render: (exception: JavaScriptException) => React.ReactNode;
    children: React.ReactNode;
}

interface Props extends OwnProps, DispatchProp {}

interface State {
    exception: JavaScriptException | null;
}

class ErrorBoundary extends React.PureComponent<Props, State> {
    static defaultProps: Pick<Props, "render"> = {render: () => null};

    constructor(props: Props) {
        super(props);
        this.state = {exception: null};
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({exception: new JavaScriptException(error.message, error.name)});
        SentryHelper.captureError(error, "<ErrorBoundary>", errorInfo);
    }

    render() {
        return this.state.exception ? this.props.render(this.state.exception) : this.props.children;
    }
}

export default connect()(ErrorBoundary);

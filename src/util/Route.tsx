import React from "react";
import {Redirect, Route as ReactRouterDOMRoute, RouteComponentProps, RouteProps} from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import {app} from "../app";

interface Props extends RouteProps {
    component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
    // All below are optional
    withErrorBoundary: boolean;
    accessCondition: boolean;
    unauthorizedRedirectTo: string;
    notFound: boolean;
}

export default class Route extends React.PureComponent<Props> {
    static defaultProps: Pick<Props, "exact" | "withErrorBoundary" | "accessCondition" | "unauthorizedRedirectTo" | "notFound"> = {
        exact: true,
        withErrorBoundary: true,
        accessCondition: true,
        unauthorizedRedirectTo: "/",
        notFound: false,
    };

    renderRegularRouteComponent = (props: RouteComponentProps<any>): React.ReactElement => {
        const {component: TargetComponent, accessCondition, unauthorizedRedirectTo, notFound} = this.props;
        if (accessCondition) {
            if (notFound) {
                const EnhancedComponent = withNotFoundWarning(TargetComponent);
                return <EnhancedComponent {...props} />;
            } else {
                return <TargetComponent {...props} />;
            }
        } else {
            return <Redirect to={unauthorizedRedirectTo} />;
        }
    };

    render() {
        const {withErrorBoundary, component, ...restRouteProps} = this.props;
        const routeNode = <ReactRouterDOMRoute {...restRouteProps} render={this.renderRegularRouteComponent} />;
        return withErrorBoundary ? <ErrorBoundary>{routeNode}</ErrorBoundary> : routeNode;
    }
}

function withNotFoundWarning<T extends {}>(WrappedComponent: React.ComponentType<T>): React.ComponentType<T> {
    return class extends React.PureComponent<T> {
        componentDidMount() {
            app.logger.warn({
                action: "@@router/404",
                elapsedTime: 0,
                errorMessage: `${location.href} not supported by <Route>`,
                errorCode: "ROUTE_NOT_FOUND",
                info: {},
            });
        }

        render() {
            return <WrappedComponent {...this.props} />;
        }
    };
}

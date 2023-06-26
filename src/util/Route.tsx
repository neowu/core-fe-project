import React from "react";
import {Redirect, Route as ReactRouterDOMRoute, type RouteComponentProps, type RouteProps} from "react-router-dom";
import {ErrorBoundary} from "./ErrorBoundary";
import {app} from "../app";

interface Props extends RouteProps {
    component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
    // All below are optional
    withErrorBoundary: boolean;
    accessCondition: boolean;
    unauthorizedRedirectTo: string;
    notFound: boolean;
}

export class Route extends React.PureComponent<Props> {
    static defaultProps: Pick<Props, "exact" | "sensitive" | "withErrorBoundary" | "accessCondition" | "unauthorizedRedirectTo" | "notFound"> = {
        exact: true,
        sensitive: true,
        withErrorBoundary: true,
        accessCondition: true,
        unauthorizedRedirectTo: "/",
        notFound: false,
    };

    renderRegularRouteComponent = (props: RouteComponentProps<any>): React.ReactElement => {
        const {component, accessCondition, unauthorizedRedirectTo, notFound, withErrorBoundary} = this.props;
        if (accessCondition) {
            const WrappedComponent = notFound ? withNotFoundWarning(component) : component;
            const routeNode = <WrappedComponent {...props} />;
            return withErrorBoundary ? <ErrorBoundary>{routeNode}</ErrorBoundary> : routeNode;
        } else {
            return <Redirect to={unauthorizedRedirectTo} />;
        }
    };

    override render() {
        const {component, ...restRouteProps} = this.props;
        return <ReactRouterDOMRoute {...restRouteProps} render={this.renderRegularRouteComponent} />;
    }
}

function withNotFoundWarning<T extends {}>(WrappedComponent: React.ComponentType<T>): React.ComponentType<T> {
    return class extends React.PureComponent<T> {
        override componentDidMount() {
            app.logger.warn({
                action: "@@framework/route-404",
                elapsedTime: 0,
                errorMessage: `${location.href} not supported by <Route>`,
                errorCode: "ROUTE_NOT_FOUND",
                info: {},
            });
        }

        override render() {
            return <WrappedComponent {...this.props} />;
        }
    };
}

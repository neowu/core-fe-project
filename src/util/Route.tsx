import React from "react";
import {RouteProps} from "react-router";
import {Redirect, Route as ReactRouterDOMRoute} from "react-router-dom";
import {ErrorBoundary} from "./ErrorBoundary";

interface Props extends RouteProps {
    component: React.ComponentType<any>;
    withErrorBoundary?: boolean;
    accessCondition?: boolean;
    unauthorizedRedirectTo?: string;
}

export class Route extends React.PureComponent<Props> {
    public static defaultProps: Pick<Props, "exact" | "withErrorBoundary" | "accessCondition" | "unauthorizedRedirectTo"> = {
        exact: true,
        withErrorBoundary: true,
        accessCondition: true,
        unauthorizedRedirectTo: "/",
    };

    render() {
        const {component, withErrorBoundary, accessCondition, unauthorizedRedirectTo, ...restProps} = this.props;
        const TargetComponent = component;
        const routeNode = <ReactRouterDOMRoute {...restProps} render={props => (accessCondition ? <TargetComponent {...props} /> : <Redirect to={{pathname: unauthorizedRedirectTo}} />)} />;
        return withErrorBoundary ? <ErrorBoundary>{routeNode}</ErrorBoundary> : routeNode;
    }
}

import React from "react";
import {Route as ReactRouterDOMRoute, RouteProps, useLocation, useParams} from "react-router-dom";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {app} from "../app";
import {ModuleHistoryLocation} from "./Module";

interface Props extends Omit<RouteProps, "element"> {
    component: React.ComponentType;
    withErrorBoundary?: boolean;
    notFound?: boolean;
}

export function ModuleRoute({component, notFound = false, withErrorBoundary = true, caseSensitive = true, path, ...restRouteProps}: Props) {
    const WrappedComponent = moduleWrap(component, notFound, withErrorBoundary);
    return <ReactRouterDOMRoute {...restRouteProps} path={notFound ? "*" : path} caseSensitive={caseSensitive} element={<WrappedComponent />} />;
}

export interface ModuleWrapperProps {
    "@@route-flag"?: true;
    "@@route-param"?: any;
    "@@route-location"?: ModuleHistoryLocation<any>;
}

function moduleWrap(ModuleComponent: React.ComponentType<ModuleWrapperProps>, notFoundWarning: boolean, withErrorBoundary: boolean): React.ComponentType {
    return function () {
        const params = useParams();
        const location = useLocation();
        React.useEffect(() => {
            if (notFoundWarning) {
                app.logger.warn({
                    action: "@@framework/route-404",
                    elapsedTime: 0,
                    errorMessage: `${window.location.href} not supported by <ModuleRoute>`,
                    errorCode: "ROUTE_NOT_FOUND",
                    info: {},
                });
            }
        }, []);

        const moduleProps: Required<ModuleWrapperProps> = {
            "@@route-flag": true,
            "@@route-param": params,
            "@@route-location": location,
        };

        if (withErrorBoundary) {
            return (
                <ErrorBoundary>
                    <ModuleComponent {...moduleProps} />
                </ErrorBoundary>
            );
        } else {
            return <ModuleComponent {...moduleProps} />;
        }
    };
}

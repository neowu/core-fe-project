import {createBrowserHistory, Location} from "history";
import {RouteComponentProps} from "react-router";

type PossibleRouteProps = RouteComponentProps | {};

export const browserHistory = createBrowserHistory();

export function getModuleRenderParameterFromRoute(props: PossibleRouteProps): [{[key: string]: string}, Location<any>] {
    if ("match" in props && "location" in props) {
        return [props.match.params, props.location];
    } else {
        return [{}, browserHistory.location];
    }
}

import "@babel/polyfill";

export {createModuleActionDecorator} from "./decorator/helper";
export {loading, interval} from "./decorator/action";
export {retainStateOnLeave} from "./decorator/class";

export {renderDOMApp} from "./platform/react-dom";
export {Handler} from "./module/handler";
export {register} from "./module/register";

export {async} from "./util/async";
export {ErrorBoundary, ReactLifecycleException} from "./util/ErrorBoundary";
export {ajax} from "./util/network";
export {call} from "./util/sagaCall";

export {Exception, APIException, NetworkConnectionException, RuntimeException, ErrorListener} from "./exception";
export {showLoading} from "./reducer";

import {ModuleLifecycleListener} from "./module/handler";
import {State} from "./reducer";

export type ModuleLifecycleListener<T extends {} = {}> = ModuleLifecycleListener<T>;
export type State = State;

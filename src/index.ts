import "core-js/stable";
import "regenerator-runtime/runtime";
import "./debug";

export {push, replace} from "redux-first-history";
export * as immer from "immer";
export {bootstrap} from "./platform/bootstrap";
export {Module, type ModuleLocation, type ModuleLifecycleListener} from "./platform/Module";

export {async, type AsyncOptions, type AsyncErrorComponentProps} from "./util/async";
export {captureError} from "./util/error-util";
export {ajax, uri} from "./util/network";
export {sse, type SSEConfig, type SSE} from "./util/sse";
export {ErrorBoundary} from "./util/ErrorBoundary";
export {IdleDetector, IdleDetectorContext} from "./util/IdleDetector";
export {Route} from "./util/Route";

export {useAction, useObjectKeyAction, useUnaryAction, useBinaryAction, useOptionalObjectAction} from "./hooks/action";
export {useLoadingStatus} from "./hooks/loading";

export {Interval} from "./decorator/Interval";
export {Loading} from "./decorator/Loading";
export {Log} from "./decorator/Log";
export {Mutex} from "./decorator/Mutex";
export {RetryOnNetworkConnectionError} from "./decorator/RetryOnNetworkConnectionError";
export {SilentOnNetworkConnectionError} from "./decorator/SilentOnNetworkConnectionError";
export {createActionHandlerDecorator} from "./decorator/createActionHandlerDecorator";

export {Exception, APIException, NetworkConnectionException} from "./Exception";
export {showLoading, loadingAction, navigationPreventionAction, idleStateAction, idleTimeoutAction, type State} from "./reducer";
export {register, type ErrorListener} from "./module";
export {call, put, spawn, delay, all, race, fork, type SagaGenerator} from "./typed-saga";
export {logger} from "./app";

export {Switch, Redirect, NavLink, useLocation, useHistory, useParams, useRouteMatch, matchPath} from "react-router-dom";
export {useStore, useSelector, useDispatch} from "react-redux";
export type {Action, Dispatch, Reducer} from "redux";
export type {Location} from "history";
export {produce} from "immer";

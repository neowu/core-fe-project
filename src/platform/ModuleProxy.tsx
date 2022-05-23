import React from "react";
import {RouteComponentProps} from "react-router";
import {Task} from "redux-saga";
import {delay, call as rawCall, take, select, cancel, fork, ForkEffect, TakeEffect, CancelEffect, SelectEffect} from "redux-saga/effects";
import {app} from "../app";
import {ActionCreators, executeAction} from "../module";
import {Action, IDLE_STATE_ACTION, navigationPreventionAction, State} from "../reducer";
import {Module, ModuleLifecycleListener} from "./Module";
import {Location} from "history";
import {SagaGenerator} from "../typed-saga";

let startupModuleName: string | null = null;

export class ModuleProxy<M extends Module<any, any>> {
    constructor(private module: M, private actions: ActionCreators<M>) {}

    getActions(): ActionCreators<M> {
        return this.actions;
    }

    attachLifecycle<P extends object>(ComponentType: React.ComponentType<P>): React.ComponentType<P> {
        const moduleName = this.module.name as string;
        const lifecycleListener = this.module as ModuleLifecycleListener;
        const modulePrototype = Object.getPrototypeOf(lifecycleListener);
        const actions = this.actions as any;

        return class extends React.PureComponent<P> {
            static displayName = `Module[${moduleName}]`;
            private lifecycleSagaTask: Task | null = null;
            private lastDidUpdateSagaTask: Task | null = null;
            private tickCount: number = 0;
            private mountedTime: number = Date.now();

            constructor(props: P) {
                super(props);
                if (!startupModuleName) {
                    startupModuleName = moduleName;
                }
            }

            override componentDidMount() {
                this.lifecycleSagaTask = app.sagaMiddleware.run(this.lifecycleSaga.bind(this));
            }

            override componentDidUpdate(prevProps: Readonly<P>) {
                const prevLocation = (prevProps as any).location;
                const props = this.props as RouteComponentProps & P;
                const currentLocation = props.location;
                const currentRouteParams = props.match ? props.match.params : null;

                /**
                 * Only trigger onLocationMatched if current component is connected to <Route>, and location literally changed.
                 *
                 * CAVEAT:
                 *  Do not use !== to compare locations.
                 *  Because in "connected-react-router", location from rootState.router.location is not equal to current history.location in reference.
                 */
                if (currentLocation && currentRouteParams && !this.areLocationsEqual(currentLocation, prevLocation) && this.hasOwnLifecycle("onLocationMatched")) {
                    try {
                        this.lastDidUpdateSagaTask?.cancel();
                    } catch (e) {
                        // In rare case, it may throw error, just ignore
                    }
                    this.lastDidUpdateSagaTask = app.sagaMiddleware.run(function* () {
                        const action = `${moduleName}/@@LOCATION_MATCHED`;
                        const startTime = Date.now();
                        yield rawCall(executeAction, action, lifecycleListener.onLocationMatched.bind(lifecycleListener), currentRouteParams, currentLocation);
                        app.logger.info({
                            action,
                            elapsedTime: Date.now() - startTime,
                            info: {
                                // URL params should not contain any sensitive or complicated objects
                                route_params: JSON.stringify(currentRouteParams),
                                history_state: JSON.stringify(currentLocation.state),
                            },
                        });
                    });
                    app.store.dispatch(navigationPreventionAction(false));
                }
            }

            override componentWillUnmount() {
                if (this.hasOwnLifecycle("onDestroy")) {
                    app.store.dispatch(actions.onDestroy());
                }

                const currentLocation = (this.props as any).location;
                if (currentLocation) {
                    // Only cancel navigation prevention if current component is connected to <Route>
                    app.store.dispatch(navigationPreventionAction(false));
                }

                app.logger.info({
                    action: `${moduleName}/@@DESTROY`,
                    info: {
                        tick_count: this.tickCount.toString(),
                        staying_second: ((Date.now() - this.mountedTime) / 1000).toFixed(2),
                    },
                });

                try {
                    this.lastDidUpdateSagaTask?.cancel();
                    this.lifecycleSagaTask?.cancel();
                } catch (e) {
                    // In rare case, it may throw error, just ignore
                }
            }

            override render() {
                return <ComponentType {...this.props} />;
            }

            private areLocationsEqual = (a: Location, b: Location): boolean => {
                return a.pathname === b.pathname && a.search === b.search && a.hash === b.hash && a.key === b.key && a.state === b.state;
            };

            private hasOwnLifecycle = (methodName: keyof ModuleLifecycleListener): boolean => {
                return Object.prototype.hasOwnProperty.call(modulePrototype, methodName);
            };

            private *lifecycleSaga() {
                /**
                 * CAVEAT:
                 * Do not use <yield* executeAction> for lifecycle actions.
                 * It will lead to cancellation issue, which cannot stop the lifecycleSaga as expected.
                 *
                 * https://github.com/redux-saga/redux-saga/issues/1986
                 */
                const props = this.props as RouteComponentProps & P;

                const enterActionName = `${moduleName}/@@ENTER`;
                const startTime = Date.now();
                yield rawCall(executeAction, enterActionName, lifecycleListener.onEnter.bind(lifecycleListener), props);
                app.logger.info({
                    action: enterActionName,
                    elapsedTime: Date.now() - startTime,
                    info: {
                        component_props: JSON.stringify(props),
                    },
                });

                if (this.hasOwnLifecycle("onLocationMatched")) {
                    if ("match" in props && "location" in props) {
                        const initialRenderActionName = `${moduleName}/@@LOCATION_MATCHED`;
                        const startTime = Date.now();
                        const routeParams = props.match.params;
                        yield rawCall(executeAction, initialRenderActionName, lifecycleListener.onLocationMatched.bind(lifecycleListener), routeParams, props.location);
                        app.logger.info({
                            action: initialRenderActionName,
                            elapsedTime: Date.now() - startTime,
                            info: {
                                route_params: JSON.stringify(props.match.params),
                                history_state: JSON.stringify(props.location.state),
                            },
                        });
                    } else {
                        console.error(`[framework] Module component [${moduleName}] is non-route, use onEnter() instead of onLocationMatched()`);
                    }
                }

                if (moduleName === startupModuleName) {
                    createStartupPerformanceLog(`${moduleName}/@@STARTUP_PERF`);
                }

                if (this.hasOwnLifecycle("onTick")) {
                    yield rawCall(this.onTickWatcherSaga.bind(this));
                }
            }

            private *onTickWatcherSaga() {
                let runningIntervalTask: Task = yield fork(this.onTickSaga.bind(this));
                while (true) {
                    yield take(IDLE_STATE_ACTION);
                    yield cancel(runningIntervalTask); // no-op if already cancelled
                    const isActive: boolean = yield select((state: State) => state.idle.state === "active");
                    if (isActive) {
                        runningIntervalTask = yield fork(this.onTickSaga.bind(this));
                    }
                }
            }

            private *onTickSaga() {
                const tickIntervalInMillisecond = (lifecycleListener.onTick.tickInterval || 5) * 1000;
                const boundTicker = lifecycleListener.onTick.bind(lifecycleListener);
                const tickActionName = `${moduleName}/@@TICK`;
                while (true) {
                    yield rawCall(executeAction, tickActionName, boundTicker);
                    this.tickCount++;
                    yield delay(tickIntervalInMillisecond);
                }
            }
        };
    }
}

function createStartupPerformanceLog(actionName: string): void {
    if (window.performance && performance.timing) {
        // For performance timing API, please refer: https://www.w3.org/blog/2012/09/performance-timing-information/
        const now = Date.now();
        const perfTiming = performance.timing;
        const baseTime = perfTiming.navigationStart;
        const duration = now - baseTime;
        const stats: {[key: string]: number} = {};

        const createStat = (key: string, timeStamp: number) => {
            if (timeStamp >= baseTime) {
                stats[key] = timeStamp - baseTime;
            }
        };

        createStat("http_start", perfTiming.requestStart);
        createStat("http_end", perfTiming.responseEnd);
        createStat("dom_start", perfTiming.domLoading);
        createStat("dom_content", perfTiming.domContentLoadedEventEnd); // Mostly same time with domContentLoadedEventStart
        createStat("dom_end", perfTiming.loadEventEnd); // Mostly same with domComplete/loadEventStart

        const slowStartupThreshold = app.loggerConfig?.slowStartupThreshold || 5;
        if (duration / 1000 >= slowStartupThreshold) {
            app.logger.warn({
                action: actionName,
                elapsedTime: duration,
                stats,
                errorCode: "SLOW_STARTUP",
                errorMessage: `Startup took ${(duration / 1000).toFixed(2)} sec, longer than ${slowStartupThreshold}`,
            });
        } else {
            app.logger.info({
                action: actionName,
                elapsedTime: duration,
                stats,
            });
        }
    }
}

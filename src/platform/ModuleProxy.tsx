import React from "react";
import {RouteComponentProps} from "react-router";
import {Task} from "redux-saga";
import {delay, call as rawCall} from "redux-saga/effects";
import {app} from "../app";
import {ActionCreators, executeAction} from "../module";
import {navigationPreventionAction} from "../reducer";
import {Module, ModuleLifecycleListener} from "./Module";

export class ModuleProxy<M extends Module<any, any>> {
    constructor(private module: M, private actions: ActionCreators<M>) {}

    getActions(): ActionCreators<M> {
        return this.actions;
    }

    attachLifecycle<P extends object>(ComponentType: React.ComponentType<P>): React.ComponentType<P> {
        const moduleName = this.module.name as string;
        const lifecycleListener = this.module as ModuleLifecycleListener;
        const actions = this.actions as any;

        return class extends React.PureComponent<P> {
            static displayName = `Module[${moduleName}]`;
            private lifecycleSagaTask: Task | null = null;
            private lastDidUpdateSagaTask: Task | null = null;
            private successTickCount: number = 0;
            private mountedTime: number = Date.now();

            componentDidMount() {
                this.lifecycleSagaTask = app.sagaMiddleware.run(this.lifecycleSaga.bind(this));
            }

            componentDidUpdate(prevProps: Readonly<P>) {
                const prevLocation = (prevProps as any).location;
                const props = this.props as RouteComponentProps & P;
                const currentLocation = props.location;
                const currentRouteParams = props.match ? props.match.params : null;
                if (currentLocation && currentRouteParams && prevLocation !== currentLocation && lifecycleListener.onRender.isLifecycle) {
                    // Only trigger onRender if current component is connected to <Route>
                    try {
                        this.lastDidUpdateSagaTask?.cancel();
                    } catch (e) {
                        // In rare case, it may throw error, just ignore
                    }
                    this.lastDidUpdateSagaTask = app.sagaMiddleware.run(function* () {
                        const action = `${moduleName}/@@LOCATION_CHANGE_RENDER`;
                        const startTime = Date.now();
                        yield rawCall(executeAction, action, lifecycleListener.onRender.bind(lifecycleListener), currentRouteParams, currentLocation);
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

            componentWillUnmount() {
                if (lifecycleListener.onDestroy.isLifecycle) {
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
                        success_tick: this.successTickCount.toString(),
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

            render() {
                return <ComponentType {...this.props} />;
            }

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
                if (lifecycleListener.onEnter.isLifecycle) {
                    const startTime = Date.now();
                    yield rawCall(executeAction, enterActionName, lifecycleListener.onEnter.bind(lifecycleListener), props);
                    app.logger.info({
                        action: enterActionName,
                        elapsedTime: Date.now() - startTime,
                        info: {
                            component_props: JSON.stringify(props),
                        },
                    });
                } else {
                    app.logger.info({
                        action: enterActionName,
                        info: {
                            component_props: JSON.stringify(props),
                        },
                    });
                }

                if (lifecycleListener.onRender.isLifecycle) {
                    const initialRenderActionName = `${moduleName}/@@INITIAL_RENDER`;
                    if ("match" in props && "location" in props) {
                        const startTime = Date.now();
                        const routeParams = props.match.params;
                        yield rawCall(executeAction, initialRenderActionName, lifecycleListener.onRender.bind(lifecycleListener), routeParams, props.location);
                        app.logger.info({
                            action: initialRenderActionName,
                            elapsedTime: Date.now() - startTime,
                            info: {
                                route_params: JSON.stringify(props.match.params),
                                history_state: JSON.stringify(props.location.state),
                            },
                        });
                    } else {
                        console.warn(`[framework] Module [${moduleName}] is non-Route, use onEnter() instead of onRender()`);
                        const startTime = Date.now();
                        yield rawCall(executeAction, initialRenderActionName, lifecycleListener.onRender.bind(lifecycleListener), {}, app.browserHistory.location);
                        app.logger.info({
                            action: initialRenderActionName,
                            elapsedTime: Date.now() - startTime,
                        });
                    }
                }

                if (lifecycleListener.onTick.isLifecycle) {
                    const tickIntervalInMillisecond = (lifecycleListener.onTick.tickInterval || 5) * 1000;
                    const boundTicker = lifecycleListener.onTick.bind(lifecycleListener);
                    const tickActionName = `${moduleName}/@@TICK`;
                    while (true) {
                        yield rawCall(executeAction, tickActionName, boundTicker);
                        this.successTickCount++;
                        yield delay(tickIntervalInMillisecond);
                    }
                }
            }
        };
    }
}

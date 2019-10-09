import React from "react";
import {RouteComponentProps} from "react-router";
import {SagaIterator, Task} from "redux-saga";
import {delay} from "redux-saga/effects";
import {app} from "../app";
import {ActionCreators, executeAction} from "../module";
import {navigationPreventionAction, setStateAction} from "../reducer";
import {Module, ModuleLifecycleListener} from "./Module";

interface AttachLifecycleOption {
    retainStateOnLeave?: boolean;
}

export class ModuleProxy<M extends Module<any>> {
    public constructor(private module: M, private actions: ActionCreators<M>) {}

    public getActions(): ActionCreators<M> {
        return this.actions;
    }

    public attachLifecycle<P extends {}>(ComponentType: React.ComponentType<P>, config: AttachLifecycleOption = {}): React.ComponentType<P> {
        const moduleName = this.module.name;
        const initialState = (this.module as any).initialState;
        const lifecycleListener = this.module as ModuleLifecycleListener;
        const actions = this.actions as any;

        return class extends React.PureComponent<P> {
            public static displayName = `ModuleBoundary(${moduleName})`;
            private readonly lifecycleSagaTask: Task;
            private successTickCount: number = 0;

            constructor(props: P) {
                super(props);
                this.lifecycleSagaTask = app.sagaMiddleware.run(this.lifecycleSaga.bind(this));
            }

            componentDidUpdate(prevProps: Readonly<P>) {
                const prevLocation = (prevProps as any).location;
                const currentLocation = (this.props as any).location;
                const currentRouteParams = (this.props as any).match ? (this.props as any).match.params : null;
                if (currentLocation && currentRouteParams && prevLocation !== currentLocation && lifecycleListener.onRender.isLifecycle) {
                    // Only trigger onRender if current component is connected to <Route>
                    app.logger.info(`${moduleName}/@@LOCATION_CHANGE_RENDER`, {locationParams: JSON.stringify(currentRouteParams)});
                    app.store.dispatch(actions.onRender(currentRouteParams, currentLocation));
                    app.store.dispatch(navigationPreventionAction(false));
                }
            }

            componentWillUnmount() {
                if (lifecycleListener.onDestroy.isLifecycle) {
                    app.store.dispatch(actions.onDestroy());
                }

                if (!config.retainStateOnLeave) {
                    app.store.dispatch(setStateAction(moduleName, initialState, `@@${moduleName}/@@reset`));
                }

                const currentLocation = (this.props as any).location;
                if (currentLocation) {
                    // Only cancel navigation prevention if current component is connected to <Route>
                    app.store.dispatch(navigationPreventionAction(false));
                }

                this.lifecycleSagaTask.cancel();
                app.logger.info(`${moduleName}/@@DESTROY`, {retainState: Boolean(config.retainStateOnLeave).toString(), successTickCount: this.successTickCount.toString()});
            }

            private *lifecycleSaga(): SagaIterator {
                const props = this.props as (RouteComponentProps | {});
                app.logger.info(`${moduleName}/@@ENTER`, {componentProps: JSON.stringify(props)});

                if (lifecycleListener.onEnter.isLifecycle) {
                    yield* executeAction(lifecycleListener.onEnter.bind(lifecycleListener));
                }

                if (lifecycleListener.onRender.isLifecycle) {
                    if ("match" in props && "location" in props) {
                        app.logger.info(`${moduleName}/@@INITIAL_RENDER`, {locationParams: JSON.stringify(props.match.params)});
                        yield* executeAction(lifecycleListener.onRender.bind(lifecycleListener), props.match.params, props.location);
                    } else {
                        console.warn(`Module [${moduleName}] is not attached to routers, use onEnter() lifecycle instead`);
                        app.logger.info(`${moduleName}/@@INITIAL_RENDER`, {type: "Non-Route-Component"});
                        yield* executeAction(lifecycleListener.onRender.bind(lifecycleListener), {}, app.browserHistory);
                    }
                }

                if (lifecycleListener.onTick.isLifecycle) {
                    const tickIntervalInMillisecond = (lifecycleListener.onTick.tickInterval || 5) * 1000;
                    const boundTicker = lifecycleListener.onTick.bind(lifecycleListener);
                    while (true) {
                        yield* executeAction(boundTicker);
                        this.successTickCount++;
                        yield delay(tickIntervalInMillisecond);
                    }
                }
            }

            render() {
                return <ComponentType {...this.props} />;
            }
        };
    }
}

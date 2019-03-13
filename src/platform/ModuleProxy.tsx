import React from "react";
import {RouteComponentProps} from "react-router";
import {SagaIterator, Task} from "redux-saga";
import {delay, put} from "redux-saga/effects";
import {app} from "../app";
import {ActionCreators, ActionHandler} from "../module";
import {errorAction, setStateAction} from "../reducer";
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

        return class MainComponent extends React.PureComponent<P> {
            public static displayName = `ModuleBoundary(${moduleName})`;
            private readonly lifecycleSagaTask: Task;

            constructor(props: P) {
                super(props);
                this.lifecycleSagaTask = app.sagaMiddleware.run(this.lifecycleSaga.bind(this));
                console.info(`Module [${moduleName}] attached component initially rendered`);
            }

            componentDidUpdate(prevProps: Readonly<P>) {
                const prevLocation = (prevProps as any).location;
                const currentLocation = (this.props as any).location;
                const currentRouteParams = (this.props as any).match ? (this.props as any).match.params : null;
                if (currentLocation && currentRouteParams && prevLocation !== currentLocation && lifecycleListener.onRender.isLifecycle) {
                    // Only trigger if current component is connected to <Route>
                    app.store.dispatch(actions.onRender(currentRouteParams, currentLocation));
                }
            }

            componentWillUnmount() {
                if (lifecycleListener.onDestroy.isLifecycle) {
                    app.store.dispatch(actions.onLeave());
                }

                if (!config.retainStateOnLeave) {
                    app.store.dispatch(setStateAction(moduleName, initialState, `@@${moduleName}/@@reset`));
                }

                this.lifecycleSagaTask.cancel();
                console.info(`Module [${moduleName}] attached component destroyed`);
            }

            render() {
                return <ComponentType {...this.props} />;
            }

            private *lifecycleSaga(): SagaIterator {
                if (lifecycleListener.onRegister.isLifecycle) {
                    yield* runSafely(lifecycleListener.onRegister.bind(lifecycleListener));
                }

                if (lifecycleListener.onRender.isLifecycle) {
                    if ("match" in this.props && "location" in this.props) {
                        const props = (this.props as any) as RouteComponentProps;
                        yield* runSafely(lifecycleListener.onRender.bind(lifecycleListener), props.match.params, props.location);
                    } else {
                        yield* runSafely(lifecycleListener.onRender.bind(lifecycleListener), {}, app.browserHistory);
                    }
                }

                if (lifecycleListener.onTick.isLifecycle) {
                    const tickIntervalInMillisecond = (lifecycleListener.onTick.tickInterval || 5) * 1000;
                    const boundTicker = lifecycleListener.onTick.bind(lifecycleListener);
                    while (true) {
                        yield* runSafely(boundTicker);
                        yield delay(tickIntervalInMillisecond);
                    }
                }
            }
        };
    }
}

function* runSafely(handler: ActionHandler, ...payload: any[]): SagaIterator {
    try {
        yield* handler(...payload);
    } catch (error) {
        yield put(errorAction(error));
    }
}

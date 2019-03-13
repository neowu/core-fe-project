import {EventLogger} from "EventLogger";
import {Location} from "history";
import {SagaIterator} from "redux-saga";
import {app} from "./app";
import {Exception} from "./Exception";
import {browserHistory} from "./platform/route";
import {setStateAction, State} from "./reducer";

export interface LifecycleDecoratorFlag {
    isLifecycle?: boolean;
}

export interface TickIntervalDecoratorFlag {
    tickInterval?: number;
}

export interface ModuleLifecycleListener<RouteParam extends {} = {}, HistoryState extends {} = {}> {
    onRegister: (() => SagaIterator) & LifecycleDecoratorFlag;
    onRender: ((routeParameters: RouteParam, location: Location<HistoryState | undefined>) => SagaIterator) & LifecycleDecoratorFlag;
    onDestroy: (() => SagaIterator) & LifecycleDecoratorFlag;
    onTick: (() => SagaIterator) & LifecycleDecoratorFlag & TickIntervalDecoratorFlag;
}

// TODO: need to merge RouteParam & HistoryState?
export class Module<ModuleState extends {}, RouteParam extends {} = {}, HistoryState extends {} = {}, RootState extends State = State> implements ModuleLifecycleListener<RouteParam, HistoryState> {
    public constructor(public readonly name: string, private readonly initialState: ModuleState) {
        if (!app.store.getState().app[name]) {
            app.store.dispatch(setStateAction(name, initialState, `@@${name}/@@init`));
            console.info(`Module [${name}] registered`);
        }
    }

    *onRegister(): SagaIterator {
        /**
         * Called when the module is registered the first time
         * Usually used for fetching one-time configuration
         */
    }

    *onRender(routeParameters: RouteParam, location: Location<HistoryState | undefined>): SagaIterator {
        /**
         * Called when the attached component is in either case:
         * - Initially mounted
         * - Re-rendered due to location updates (only for route connected components)
         */
    }

    *onDestroy(): SagaIterator {
        /**
         * Called when the attached component is going to unmount
         */
    }

    *onTick(): SagaIterator {
        /**
         * Called periodically during the lifecycle of attached component
         * Usually used together with @Interval decorator, to specify the period (in second)
         * Attention: The next tick will not be triggered, until the current tick has finished
         */
    }

    protected get state(): Readonly<ModuleState> {
        return this.rootState.app[this.name];
    }

    protected get rootState(): Readonly<RootState> {
        return app.store.getState() as Readonly<RootState>;
    }

    protected get logger(): EventLogger {
        return app.eventLogger;
    }

    protected setState(newState: Partial<ModuleState>) {
        app.store.dispatch(setStateAction(this.name, newState, `@@${this.name}/setState[${Object.keys(newState).join(",")}]`));
    }

    protected setHistory(urlOrState: HistoryState | string, usePush: boolean = true) {
        if (typeof urlOrState === "string") {
            if (usePush) {
                browserHistory.push(urlOrState);
            } else {
                browserHistory.replace(urlOrState);
            }
        } else {
            const currentURL = location.pathname + location.search;
            if (usePush) {
                browserHistory.push(currentURL, urlOrState);
            } else {
                browserHistory.replace(currentURL, urlOrState);
            }
        }
    }
}

export type ActionHandler = (...args: any[]) => SagaIterator;

export type ErrorHandler = (error: Exception) => SagaIterator;

export interface ErrorListener {
    onError: ErrorHandler;
}

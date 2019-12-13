import {push} from "connected-react-router";
import {Location} from "history";
import {SagaIterator} from "../typed-saga";
import {app} from "../app";
import {Logger} from "../Logger";
import {LifecycleDecoratorFlag, TickIntervalDecoratorFlag} from "../module";
import {navigationPreventionAction, setStateAction, State} from "../reducer";

export interface ModuleLifecycleListener<RouteParam extends {} = {}, HistoryState extends {} = {}> {
    onEnter: ((entryComponentProps?: any) => SagaIterator) & LifecycleDecoratorFlag;
    onRender: ((routeParameters: RouteParam, location: Location<HistoryState | undefined>) => SagaIterator) & LifecycleDecoratorFlag;
    onDestroy: (() => SagaIterator) & LifecycleDecoratorFlag;
    onTick: (() => SagaIterator) & LifecycleDecoratorFlag & TickIntervalDecoratorFlag;
}

export class Module<ModuleState extends {}, RouteParam extends {} = {}, HistoryState extends {} = {}, RootState extends State = State> implements ModuleLifecycleListener<RouteParam, HistoryState> {
    constructor(readonly name: string, readonly initialState: ModuleState) {}

    *onEnter(entryComponentProps: any): SagaIterator {
        /**
         * Called when the attached component is initially mounted.
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

    get state(): Readonly<ModuleState> {
        return this.rootState.app[this.name];
    }

    get rootState(): Readonly<RootState> {
        return app.store.getState() as Readonly<RootState>;
    }

    get logger(): Logger {
        return app.logger;
    }

    setNavigationPrevented(isPrevented: boolean) {
        app.store.dispatch(navigationPreventionAction(isPrevented));
    }

    /**
     * CAVEAT:
     * Do not use Partial<ModuleState> as parameter.
     * Because it allows {foo: undefined} to be passed, and set that field undefined, which is not supposed to be.
     */
    setState<K extends keyof ModuleState>(newState: Pick<ModuleState, K> | ModuleState) {
        app.store.dispatch(setStateAction(this.name, newState, `@@${this.name}/setState[${Object.keys(newState).join(",")}]`));
    }

    setHistory(urlOrState: HistoryState | string, state: HistoryState | null = null) {
        if (typeof urlOrState === "string") {
            if (state === null) {
                app.store.dispatch(push(urlOrState));
            } else {
                app.store.dispatch(push(urlOrState, state));
            }
        } else {
            if (state !== null) {
                throw new Error("Second argument [state] should not bet set here");
            }
            const currentURL = location.pathname + location.search;
            app.store.dispatch(push(currentURL, urlOrState));
        }
    }
}

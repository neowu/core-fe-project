import {push} from "connected-react-router";
import {Location} from "history";
import {SagaGenerator} from "../typed-saga";
import {put} from "redux-saga/effects";
import {produce, enablePatches, enableES5} from "immer";
import {app} from "../app";
import {Logger} from "../Logger";
import {TickIntervalDecoratorFlag} from "../module";
import {navigationPreventionAction, setStateAction, State} from "../reducer";

enableES5();
if (process.env.NODE_ENV === "development") {
    enablePatches();
}

export type ModuleLocation<State> = Location<Readonly<State> | undefined>;

export interface ModuleLifecycleListener<RouteParam extends object = object, HistoryState extends object = object> {
    onEnter: (entryComponentProps?: any) => SagaGenerator;
    onDestroy: () => SagaGenerator;
    onLocationMatched: (routeParameters: RouteParam, location: Location<Readonly<HistoryState> | undefined>) => SagaGenerator;
    onTick: (() => SagaGenerator) & TickIntervalDecoratorFlag;
}

export class Module<RootState extends State, ModuleName extends keyof RootState["app"] & string, RouteParam extends object = object, HistoryState extends object = object> implements ModuleLifecycleListener<RouteParam, HistoryState> {
    constructor(readonly name: ModuleName, readonly initialState: RootState["app"][ModuleName]) {}

    *onEnter(entryComponentProps: any): SagaGenerator {
        /**
         * Called when the attached component is initially mounted.
         */
    }

    *onDestroy(): SagaGenerator {
        /**
         * Called when the attached component is going to unmount
         */
    }

    *onLocationMatched(routeParam: RouteParam, location: ModuleLocation<HistoryState>): SagaGenerator {
        /**
         * Called when the attached component is a React-Route component and its Route location matches
         * It is called each time the location changes, as long as it still matches
         */
    }

    *onTick(): SagaGenerator {
        /**
         * Called periodically during the lifecycle of attached component
         * Usually used together with @Interval decorator, to specify the period (in second)
         * Attention: The next tick will not be triggered, until the current tick has finished
         */
    }

    get state(): Readonly<RootState["app"][ModuleName]> {
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

    setState<K extends keyof RootState["app"][ModuleName]>(stateOrUpdater: ((state: RootState["app"][ModuleName]) => void) | Pick<RootState["app"][ModuleName], K> | RootState["app"][ModuleName]): void {
        if (typeof stateOrUpdater === "function") {
            const originalState = this.state;
            const updater = stateOrUpdater as (state: RootState["app"][ModuleName]) => void;
            let patchDescriptions: string[] | undefined;
            const newState = produce<Readonly<RootState["app"][ModuleName]>, RootState["app"][ModuleName]>(
                originalState,
                (draftState) => {
                    // Wrap into a void function, in case updater() might return anything
                    updater(draftState);
                },
                process.env.NODE_ENV === "development"
                    ? (patches) => {
                          // No need to read "op", in will only be "replace"
                          patchDescriptions = patches.map((_) => _.path.join("."));
                      }
                    : undefined
            );
            if (newState !== originalState) {
                const description = `@@${this.name}/setState${patchDescriptions ? `[${patchDescriptions.join("/")}]` : ``}`;
                app.store.dispatch(setStateAction(this.name, newState, description));
            }
        } else {
            const partialState = stateOrUpdater as object;
            this.setState((state: object) => Object.assign(state, partialState));
        }
    }

    /**
     * CAVEAT:
     * (1)
     * Calling this.pushHistory to other module should cancel the following logic.
     * Using store.dispatch here will lead to error while cancelling in lifecycle.
     *
     * Because the whole process is in sync mode:
     * dispatch push action -> location change -> router component will un-mount -> lifecycle saga cancel
     *
     * Cancelling the current sync-running saga will throw "TypeError: Generator is already executing".
     *
     * (2)
     * Adding yield cancel() in pushHistory is also incorrect.
     * If this.pushHistory is only to change state rather than URL, it will lead to the whole lifecycle saga cancelled.
     *
     * https://github.com/react-boilerplate/react-boilerplate/issues/1281
     */
    pushHistory(url: string): SagaGenerator;
    pushHistory(url: string, stateMode: "keep-state"): SagaGenerator;
    pushHistory<T extends object>(url: string, state: T): SagaGenerator; // Recommended explicitly pass the generic type
    pushHistory(state: HistoryState): SagaGenerator;

    *pushHistory(urlOrState: HistoryState | string, state?: object | "keep-state"): SagaGenerator {
        if (typeof urlOrState === "string") {
            const url: string = urlOrState;
            if (state) {
                yield put(push(url, state === "keep-state" ? app.browserHistory.location.state : state));
            } else {
                yield put(push(url));
            }
        } else {
            const currentURL = location.pathname + location.search;
            const state: HistoryState = urlOrState;
            yield put(push(currentURL, state));
        }
    }
}

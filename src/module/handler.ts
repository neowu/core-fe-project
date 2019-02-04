import {push, replace} from "connected-react-router";
import {Location} from "history";
import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {app} from "../app";
import {Exception} from "../exception";
import {setStateAction, State} from "../reducer";

export class Module<ModuleState extends {}, HistoryState extends {} = {}, RootState extends State = State> {
    public constructor(public readonly name: string, private readonly initialState: ModuleState) {
        app.store.dispatch(setStateAction(name, initialState, `@@${name}/@@INIT`));
    }

    protected get state(): Readonly<ModuleState> {
        return this.rootState.app[this.name];
    }

    protected get rootState(): Readonly<RootState> {
        return app.store.getState() as Readonly<RootState>;
    }

    protected *setState(newState: Partial<ModuleState>): SagaIterator {
        yield put(setStateAction(this.name, newState, `@@${this.name}/setState[${Object.keys(newState).join(",")}]`));
    }

    protected *setHistory(urlOrState: HistoryState | string, usePush: boolean = true): SagaIterator {
        if (typeof urlOrState === "string") {
            yield put(usePush ? push(urlOrState) : replace(urlOrState));
        } else {
            const currentURL = location.pathname + location.search;
            yield put(usePush ? push(currentURL, urlOrState) : replace(currentURL, urlOrState));
        }
    }
}

export type ActionHandler = (...args: any[]) => SagaIterator;

export interface ModuleLifecycleListener<RouteParam extends {} = {}, HistoryState extends {} = {}> {
    onRegister?(): SagaIterator;
    onEnter?(routeParameters: RouteParam, location: Location<HistoryState | undefined>): SagaIterator;
    onLeave?(): SagaIterator;
    onTick?(): SagaIterator;
}

export type ErrorHandler = (error: Exception) => SagaIterator;

export interface ErrorListener {
    onError: ErrorHandler;
}

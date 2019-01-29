import {Location} from "history";
import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {app} from "../app";
import {setStateAction, State} from "../reducer";

export class Handler<S extends object, RS extends State = State> {
    readonly module: string;
    private readonly initialState: S;

    public constructor(module: string, initialState: S) {
        this.module = module;
        this.initialState = initialState;
    }

    protected get state(): Readonly<S> {
        return this.rootState.app[this.module];
    }

    protected get rootState(): Readonly<RS> {
        return app.store.getState() as Readonly<RS>;
    }

    protected *setState(newState: Partial<S>): SagaIterator {
        yield put(setStateAction(this.module, newState, `@@${this.module}/setState[${Object.keys(newState).join(",")}]`));
    }
}

export interface ModuleLifecycleListener<T extends {} = {}> {
    onEnter?(routeParameters: T, location: Location): SagaIterator;
    onLeave?(): SagaIterator;
    onTick?(): SagaIterator;
}

export type ActionHandler = (...args: any[]) => SagaIterator;

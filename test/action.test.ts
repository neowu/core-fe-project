import {tick} from "action/module";
import {global, run} from "action/handler";
import {TickListener} from "listener";
import {delay, SagaIterator} from "redux-saga";
import {call, put} from "redux-saga/effects";
import {Handler, register} from "app";

test("register", () => {
    interface State {
        name: string;
    }

    const initialState: State = {
        name: "value",
    };

    class ActionHandler extends Handler<State> {
        constructor() {
            super("namespace", initialState);
        }

        action1(name: string): State {
            return this.state();
        }

        action2(): State {
            return this.state();
        }

        *action3(name: string): SagaIterator {
            yield put(actions.action1(name));
        }

        @global
        *action4(): SagaIterator {
            yield put(actions.action2());
        }
    }

    const actions = register(new ActionHandler());
    const action1 = actions.action1("value");
    expect(action1.type).toEqual("namespace/action1");
    expect(action1.payload).toEqual(["value"]);

    const action2 = actions.action2();
    expect(action2.type).toEqual("namespace/action2");
    expect(action2.payload).toEqual([]);

    const action4 = actions.action4();
    expect(action4.type).toEqual("action4");
    expect(action4.payload).toEqual([]);
});

test("tick", () => {
    const onTick = {interval: 3} as TickListener;
    const generator1 = tick(onTick, 3);
    expect(generator1.next().value).toEqual(call(run, onTick, []));
    expect(generator1.next().value).toEqual(call(delay, 3000));
    expect(generator1.next().value).toEqual(call(run, onTick, []));
    expect(generator1.next().value).toEqual(call(delay, 3000));

    const generator2 = tick(onTick, undefined);
    expect(generator2.next().value).toEqual(call(run, onTick, []));
    expect(generator2.next().value).toEqual(call(delay, 1000));
    expect(generator2.next().value).toEqual(call(run, onTick, []));
    expect(generator2.next().value).toEqual(call(delay, 1000));
});

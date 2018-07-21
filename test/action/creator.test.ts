import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {actionCreator} from "action/creator";
import {Handler} from "app";
import {global} from "action/handler";

test("actionCreator", () => {
    interface State {
        name: string;
    }

    const initialState: State = {
        name: "value",
    };

    class TestHandler extends Handler<State> {
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

    const actions = actionCreator(new TestHandler());
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

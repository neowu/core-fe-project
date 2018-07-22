import {actionCreator} from "action/creator";
import {Handler} from "action/handler";
import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";

test("actionCreator", () => {
    const initialState = {
        name: "value",
    };

    class TestHandler extends Handler<typeof initialState> {
        constructor() {
            super("test", initialState);
        }

        action1(name: string) {
            return this.state();
        }

        action2() {
            return this.state();
        }

        *action3(name: string): SagaIterator {
            yield put(actions.action1(name));
        }

        *action4(): SagaIterator {
            yield put(actions.action2());
        }
    }

    const actions = actionCreator(new TestHandler());
    const action1 = actions.action1("value");
    expect(action1.type).toEqual("test/action1");
    expect(action1.payload).toEqual(["value"]);

    const action2 = actions.action2();
    expect(action2.type).toEqual("test/action2");
    expect(action2.payload).toEqual([]);

    const resetAction = actions.resetState();
    expect(resetAction.type).toEqual("test/resetState");
    expect(resetAction.payload).toEqual([]);
});

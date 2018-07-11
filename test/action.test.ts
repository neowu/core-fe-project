import {actionCreator} from "action";
import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {effect, global} from "handler";

test("actionCreator", () => {
    interface State {
        name: string;
    }

    const initialState: State = {
        name: "value",
    };

    class ActionHandler {
        action1(payload: {name: string}, state: State = initialState): State {
            return state;
        }

        action2(payload?: void, state: State = initialState): State {
            return state;
        }

        @effect
        *action3(payload: {name: string}): SagaIterator {
            yield put(actions.action1(payload));
        }

        @global
        *action4(): SagaIterator {
            yield put(actions.action2());
        }
    }

    const handler = new ActionHandler();
    const actions = actionCreator("namespace", handler);
    const payload1 = {name: "value"};
    const action1 = actions.action1(payload1);
    expect(action1.type).toEqual("namespace/action1");
    expect(action1.payload).toEqual(payload1);

    const action2 = actions.action2();
    expect(action2.type).toEqual("namespace/action2");
    expect(action2.payload).toBeUndefined();

    const action4 = actions.action4();
    expect(action4.type).toEqual("action4");
    expect(action4.payload).toBeUndefined();
});

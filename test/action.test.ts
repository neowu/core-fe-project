import {actionCreator} from "action";
import {put} from "redux-saga/effects";

test("actionCreator", () => {
    interface State {
        name: string;
    }

    const initialState: State = {
        name: "value",
    };

    interface Actions {
        action1(payload: {name: string}): void;

        action2(): void;

        action3(payload: {name: string}): void;
    }

    class ActionHandler implements Actions {
        action1(payload: {name: string}, state: State = initialState): State {
            return state;
        }

        action2(payload?: void, state: State = initialState): State {
            return state;
        }

        *action3(payload: {name: string}) {
            yield put(actions.action1(payload));
        }
    }

    const handler = new ActionHandler();
    const actions = actionCreator<Actions>("namespace", handler);
    const payload1 = {name: "value"};
    const action1 = actions.action1(payload1);
    expect(action1.type).toEqual("namespace/action1");
    expect(action1.payload).toEqual(payload1);

    const action2 = actions.action2();
    expect(action2.type).toEqual("namespace/action2");
    expect(action2.payload).toBeUndefined();
});

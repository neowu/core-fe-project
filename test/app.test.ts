import {push} from "connected-react-router";
import {SagaIterator} from "redux-saga";
import {put} from "redux-saga/effects";
import {Handler} from "action/handler";
import {register} from "app";

test("register", () => {
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
            yield put(push("/"));
        }

        *action4(): SagaIterator {
            yield put(push("/"));
        }
    }

    register(new TestHandler());
});

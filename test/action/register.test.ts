import {Handler} from "action/handler";
import {keys} from "action/register";
import {delay, SagaIterator} from "redux-saga";
import {call} from "redux-saga/effects";

test("keys", () => {
    class TestHandler extends Handler<{}> {
        *action1(name: string): SagaIterator {
            yield call(delay, 300);
            yield* this.setState({name, condition: false});
        }

        *action2(): SagaIterator {
            yield* this.resetState();
        }
    }

    const handlerKeys = keys(new TestHandler("test", {}));
    expect(handlerKeys).toEqual(["action1", "action2"]);
});

import {Handler} from "action/handler";
import {keys} from "action/register";
import {SagaIterator} from "redux-saga";
import {delay} from "redux-saga/effects";

test("keys", () => {
    class TestHandler extends Handler<{}> {
        *action1(name: string): SagaIterator {
            yield delay(300);
            yield* this.setState({name, condition: false});
        }

        *action2(): SagaIterator {
            yield* this.resetState();
        }
    }

    const handlerKeys = keys(new TestHandler("test", {}));
    expect(handlerKeys).toEqual(["action1", "action2"]);
});

import {actionCreator} from "action/creator";
import {Handler} from "action/handler";
import {Listener} from "action/listener";
import {delay} from "redux-saga/effects";

test("actionCreator", () => {
    class TestHandler extends Handler<{}> implements Listener {
        *action1(name: string) {
            yield delay(300);
        }

        *action2() {
            const value = this.nonGenerator();
            yield* this.action1(value.toString());
            yield* this.resetState();
        }

        // We cannot get actions.onInitialized
        *onInitialized() {
            yield delay(10);
        }

        // Un-callable via actions.nonGenerator, but can be used in this.nonGenerator()
        // Best Practice: Use private for such methods
        private nonGenerator() {
            return 10;
        }
    }

    const actions = actionCreator(new TestHandler("test", {}));
    const action1 = actions.action1("value");
    expect(action1.type).toEqual("test/action1");
    expect(action1.payload).toEqual(["value"]);

    const action2 = actions.action2();
    expect(action2.type).toEqual("test/action2");
    expect(action2.payload).toEqual([]);

    // The following code triggers error
    // actions.nonGenerator();
});

import {Handler} from "action/handler";
import {keys} from "action/register";

test("keys", () => {
    class TestHandler extends Handler<{}> {
        action1(name: string) {
            return this.state;
        }

        action2() {
            return this.state;
        }
    }

    const handlerKeys = keys(new TestHandler("test", {}));
    expect(handlerKeys).toEqual(["action1", "action2", "resetState"]);
});

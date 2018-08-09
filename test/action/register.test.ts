import {Handler} from "action/handler";
import {Listener} from "action/listener";
import {keys} from "action/register";
import {delay, SagaIterator} from "redux-saga";
import {State} from "state";
import {call, put} from "redux-saga/effects";

test("keys", () => {
    const initialState = {
        name: "value",
        digit: 10,
        isGood: true,
    };

    interface RootState extends State {
        app: {
            main: {};
        };
    }

    class TestHandler extends Handler<typeof initialState, RootState> implements Listener {
        *effect1(name: string): SagaIterator {
            yield call(delay, 300);
            yield this.setState({name, isGood: false});
        }

        *effect2(): SagaIterator {
            yield this.resetState();
            yield* this.generator();
        }

        // We cannot get actions.onInitialized
        *onInitialized(): SagaIterator {
            yield call(delay, 10);
        }

        // Can only called this.nonGenerator()
        private nonGenerator(): number {
            return 10;
        }

        // Can only called this.nonGenerator()
        private *generator(): SagaIterator {
            yield call(delay, 500);
        }
    }

    const handlerKeys = keys(new TestHandler("test", initialState));
    expect(handlerKeys).toEqual(["effect1", "effect2", "onInitialized", "nonGenerator", "generator"]);
});

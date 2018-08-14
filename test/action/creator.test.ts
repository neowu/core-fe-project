import {actionCreator} from "action/creator";
import {Handler} from "action/handler";
import {Listener} from "action/listener";
import {SagaIterator, delay} from "redux-saga";
import {put, call} from "redux-saga/effects";
import {State} from "state";

test("actionCreator", () => {
    const initialState = {
        name: "value",
        digit: 10,
        condition: true,
    };

    interface RootState extends State {
        app: {
            main: {};
        };
    }

    class TestHandler extends Handler<typeof initialState, RootState> implements Listener {
        *effect1(name: string): SagaIterator {
            yield call(delay, 300);
            yield* this.setState({name, condition: false});
        }

        *effect2(): SagaIterator {
            const value = this.nonGenerator();
            yield* this.effect1(value.toString());
            yield* this.resetState();
        }

        // We cannot get actions.onInitialized
        *onInitialized(): SagaIterator {
            yield call(delay, 10);
        }

        // Un-callable via actions.nonGenerator, but can be used in this.nonGenerator()
        // Best Practice: Use private for such methods
        private nonGenerator(): number {
            return 10;
        }
    }

    const actions = actionCreator(new TestHandler("test", initialState));
    const effect1 = actions.effect1("value");
    expect(effect1.type).toEqual("test/effect1");
    expect(effect1.payload).toEqual(["value"]);

    const effect2 = actions.effect2();
    expect(effect2.type).toEqual("test/effect2");
    expect(effect2.payload).toEqual([]);

    // The following code triggers error
    // actions.nonGenerator();
});

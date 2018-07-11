import {push} from "connected-react-router";
import {run} from "handler";
import {TickListener} from "listener";
import {initializeModule, register} from "module/module";
import {delay} from "redux-saga";
import {call, put} from "redux-saga/effects";

test("tick every 3 secs", () => {
    const onTick = {interval: 3} as TickListener;
    const generator = initializeModule({onTick});
    expect(generator.next().value).toEqual(call(run, onTick));
    expect(generator.next().value).toEqual(call(delay, 3000));
    expect(generator.next().value).toEqual(call(run, onTick));
    expect(generator.next().value).toEqual(call(delay, 3000));
});

test("tick every 1 sec by default", () => {
    const onTick = {} as TickListener;
    const generator = initializeModule({onTick});
    expect(generator.next().value).toEqual(call(run, onTick));
    expect(generator.next().value).toEqual(call(delay, 1000));
    expect(generator.next().value).toEqual(call(run, onTick));
    expect(generator.next().value).toEqual(call(delay, 1000));
});

test("register", () => {
    interface Payload {
        name: string;
    }

    interface State {
        name: string;
    }

    const initialState: State = {
        name: "value",
    };

    class ActionHandler {
        action1(payload: Payload, state: State = initialState): State {
            return state;
        }

        action2(payload: void, state: State = initialState): State {
            return state;
        }

        *action3(payload: Payload) {
            yield put(push("/"));
        }
    }

    const namespace = "test";
    const handler = new ActionHandler();
    register({namespace, handler, initialState});
});

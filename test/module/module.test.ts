import {run} from "handler";
import {TickListener} from "listener";
import {initializeModule} from "module/module";
import {delay} from "redux-saga";
import {call} from "redux-saga/effects";

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

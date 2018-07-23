import {run} from "action/handler";
import {tick, TickListener} from "action/listener";
import {delay} from "redux-saga";
import {call} from "redux-saga/effects";

test("tick", () => {
    const onTick = {interval: 3} as TickListener;
    const generator = tick(onTick);
    expect(generator.next().value).toEqual(call(run, onTick, []));
    expect(generator.next().value).toEqual(call(delay, 3000));
    expect(generator.next().value).toEqual(call(run, onTick, []));
    expect(generator.next().value).toEqual(call(delay, 3000));
});

test("tick without interval", () => {
    const onTick = {} as TickListener;
    const generator = tick(onTick);
    expect(generator.next().value).toEqual(call(run, onTick, []));
    expect(generator.next().value).toEqual(call(delay, 1000));
    expect(generator.next().value).toEqual(call(run, onTick, []));
    expect(generator.next().value).toEqual(call(delay, 1000));
});

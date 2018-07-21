import {run} from "action/handler";
import {tick} from "action/register";
import {TickListener} from "listener";
import {delay} from "redux-saga";
import {call} from "redux-saga/effects";

test("tick", () => {
    const onTick = {interval: 3} as TickListener;
    const generator1 = tick(onTick, 3);
    expect(generator1.next().value).toEqual(call(run, onTick, []));
    expect(generator1.next().value).toEqual(call(delay, 3000));
    expect(generator1.next().value).toEqual(call(run, onTick, []));
    expect(generator1.next().value).toEqual(call(delay, 3000));

    const generator2 = tick(onTick, undefined);
    expect(generator2.next().value).toEqual(call(run, onTick, []));
    expect(generator2.next().value).toEqual(call(delay, 1000));
    expect(generator2.next().value).toEqual(call(run, onTick, []));
    expect(generator2.next().value).toEqual(call(delay, 1000));
});

import {callAJAX} from "ajax/call";

test("callAJAX", () => {
    const ajax = (request: string): Promise<string> => Promise.resolve(request);

    const effect = callAJAX(ajax, "value");
    const call = effect.CALL;
    expect(call.args).toEqual(["value"]);
    expect(call.fn.apply(call.context, call.args))
        .resolves.toEqual("value")
        .then(() => expect(effect.response()).toEqual("value"));
});

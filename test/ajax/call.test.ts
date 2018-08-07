import {callWithResult} from "call";

test("callAJAX", () => {
    const ajax = (request: string): Promise<string> => Promise.resolve(request);

    const effect = callWithResult(ajax, "value");
    const call = effect.CALL;
    expect(call.args).toEqual(["value"]);
    expect(call.fn.apply(call.context, call.args))
        .resolves.toEqual("value")
        .then(() => expect(effect.result()).toEqual("value"));
});

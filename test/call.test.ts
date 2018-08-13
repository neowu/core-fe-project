import {call} from "call";

test("call", () => {
    const promise = (request: string): Promise<string> => Promise.resolve(request);

    const effect = call(promise, "value");
    const descriptor = effect.CALL;
    expect(descriptor.args).toEqual(["value"]);
    expect(descriptor.fn.apply(descriptor.context, descriptor.args))
        .resolves.toEqual("value")
        .then(() => expect(effect.result()).toEqual("value"));
});

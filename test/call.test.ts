import {call} from "call";

test("call", () => {
    const promise = (request: string): Promise<string> => Promise.resolve(request);

    const effect = call(promise, "value");
    const payload = effect.payload;
    expect(payload.args).toEqual(["value"]);
    expect(payload.fn.apply(payload.context, payload.args))
        .resolves.toEqual("value")
        .then(() => expect(effect.result()).toEqual("value"));
});

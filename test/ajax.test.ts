import {callAJAX, json, url} from "ajax";

test("json", () => {
    expect(json('{"date": "2018-05-24T12:00:00.000Z"}')).toEqual({date: new Date("2018-05-24T12:00:00.000Z")});
});

test("url", () => {
    expect(url("/user", {})).toEqual("/user");
    expect(url("/user/:id", {id: 1})).toEqual("/user/1");
    expect(url("/user/:userId/item/:itemId", {userId: "1", itemId: "2"})).toEqual("/user/1/item/2");
});

test("callAJAX", () => {
    const ajax = (request: string): Promise<string> => Promise.resolve(request);

    const effect = callAJAX(ajax, "value");
    const call = effect.CALL;
    expect(call.args).toEqual(["value"]);
    expect(call.fn.apply(call.context, call.args))
        .resolves.toEqual("value")
        .then(() => expect(effect.response()).toEqual("value"));
});

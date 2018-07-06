import {json, url} from "ajax/ajax";

test("json", () => {
    expect(json('{"date": "2018-05-24T12:00:00.000Z"}')).toEqual({date: new Date("2018-05-24T12:00:00.000Z")});
});

test("url", () => {
    expect(url("/user", {})).toEqual("/user");
    expect(url("/user/:id", {id: 1})).toEqual("/user/1");
    expect(url("/user/:userId/item/:itemId", {userId: "1", itemId: "2"})).toEqual("/user/1/item/2");
});

import {urlParams} from "../../src/util/network";

test("url", () => {
    expect(urlParams("/user", {})).toEqual("/user");
    expect(urlParams("/user/:id", {id: 1})).toEqual("/user/1");
    expect(urlParams("/user/:userId/item/:itemId", {userId: "1", itemId: "2"})).toEqual("/user/1/item/2");
});

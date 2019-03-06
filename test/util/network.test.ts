import {json, url} from "util/network";

test("json with supported date formats", () => {
    expect(json('{"date": "2018-05-24T12:00:00.123456Z"}')).toEqual({date: new Date("2018-05-24T12:00:00.123456Z")});
    expect(json('{"date": "2018-05-24T12:00:00.123Z"}')).toEqual({date: new Date("2018-05-24T12:00:00.123Z")});
    expect(json('{"date": "2018-05-24T12:00:00Z"}')).toEqual({date: new Date("2018-05-24T12:00:00Z")});
    expect(json('{"date": "2018-09-10T15:08:44.123456-04:00"}')).toEqual({date: new Date("2018-09-10T15:08:44.123456-04:00")});
    expect(json('{"date": "2018-09-10T15:08:44-04:00"}')).toEqual({date: new Date("2018-09-10T15:08:44-04:00")});
});

test("json with not supported date formats", () => {
    expect(json('{"date": "2018-09-10T15:08"}')).toEqual({date: "2018-09-10T15:08"});
    expect(json('{"date": "2018-09-04T14:09:53.123"}')).toEqual({date: "2018-09-04T14:09:53.123"});
    expect(json('{"date": "2018-09-04T14:09:53"}')).toEqual({date: "2018-09-04T14:09:53"});

    /**
     * Simple date (corresponding to Java LocalDate) should not be transformed as Date.
     * Because if Java LocalDate is transformed to JS Date, UTC time will be appended.
     * Then the browser will show the date in its local time, which may lead to one-day difference.
     */
    expect(json('{"date": "2018-09-10"}')).toEqual({date: "2018-09-10"});
});

test("json", () => {
    expect(json('{"time": "14:09:53"}')).toEqual({time: "14:09:53"});
    expect(json('{"key1": "value1", "key2": 2}')).toEqual({key1: "value1", key2: 2});
});

test("url", () => {
    expect(url("/user", {})).toEqual("/user");
    expect(url("/user/:id", {id: 1})).toEqual("/user/1");
    expect(url("/user/:userId/item/:itemId", {userId: "1", itemId: "2"})).toEqual("/user/1/item/2");
});

import {parseWithDate, stringifyWithMask} from "../../src/util/json-util";

test("parseJSONWithDate (with valid Date)", () => {
    expect(parseWithDate('{"date": "2018-05-24T12:00:00.123456Z"}')).toEqual({date: new Date("2018-05-24T12:00:00.123456Z")});
    expect(parseWithDate('{"date": "2018-05-24T12:00:00.123Z"}')).toEqual({date: new Date("2018-05-24T12:00:00.123Z")});
    expect(parseWithDate('{"date": "2018-05-24T12:00:00Z"}')).toEqual({date: new Date("2018-05-24T12:00:00Z")});
    expect(parseWithDate('{"date": "2018-09-10T15:08:44.123456-04:00"}')).toEqual({date: new Date("2018-09-10T15:08:44.123456-04:00")});
    expect(parseWithDate('{"date": "2018-09-10T15:08:44-04:00"}')).toEqual({date: new Date("2018-09-10T15:08:44-04:00")});
});

test("parseJSONWithDate (without valid Date)", () => {
    expect(parseWithDate('{"time": "14:09:53"}')).toEqual({time: "14:09:53"});
    expect(parseWithDate('{"key1": "value1", "key2": 2}')).toEqual({key1: "value1", key2: 2});
    expect(parseWithDate('{"date": "2018-09-10T15:08"}')).toEqual({date: "2018-09-10T15:08"});
    expect(parseWithDate('{"date": "2018-09-04T14:09:53.123"}')).toEqual({date: "2018-09-04T14:09:53.123"});
    expect(parseWithDate('{"date": "2018-09-04T14:09:53"}')).toEqual({date: "2018-09-04T14:09:53"});
    /**
     * Simple date (corresponding to Java LocalDate) should not be transformed as Date.
     * Because if Java LocalDate is transformed to JS Date, UTC time will be appended.
     * Then the browser will show the date in its local time, which may lead to one-day difference.
     */
    expect(parseWithDate('{"date": "2018-09-10"}')).toEqual({date: "2018-09-10"});
});

test('stringifyWithMask (with mask "password")', () => {
    const mask = [/password/i];
    const maskedOutput = "***";

    expect(stringifyWithMask(mask, maskedOutput, {password: "123456"})).toEqual(`{"password":"${maskedOutput}"}`);
    expect(stringifyWithMask(mask, maskedOutput, {password: "123456", fn: () => 1})).toEqual(`{"password":"${maskedOutput}"}`);
    expect(stringifyWithMask(mask, maskedOutput, {password: "123456"}, () => 1)).toEqual(`{"password":"${maskedOutput}"}`);
    expect(stringifyWithMask(mask, maskedOutput, {password: "123456"}, Symbol.iterator)).toEqual(`{"password":"${maskedOutput}"}`);
    expect(stringifyWithMask(mask, maskedOutput, {password: "123456"}, {name: "jim"})).toEqual(`[{"password":"${maskedOutput}"},{"name":"jim"}]`);
    expect(stringifyWithMask(mask, maskedOutput, {name: "jim", password: "123456"})).toEqual(`{"name":"jim","password":"${maskedOutput}"}`);
    expect(stringifyWithMask(mask, maskedOutput, {name: "123"})).toEqual(`{"name":"123"}`);
    expect(stringifyWithMask(mask, maskedOutput, {PASSWORD: "123"})).toEqual(`{"PASSWORD":"${maskedOutput}"}`);
    expect(stringifyWithMask(mask, maskedOutput, {name: "jim", anotherPassword: "123456"})).toEqual(`{"name":"jim","anotherPassword":"${maskedOutput}"}`);
    expect(stringifyWithMask(mask, maskedOutput, {name: "jim", pwd: "123456"})).toEqual(`{"name":"jim","pwd":"123456"}`);
    expect(stringifyWithMask(mask, maskedOutput)).toEqual(undefined);
});

test("stringifyWithMask (cyclic reference)", () => {
    const circularReference: {data: number; self?: any} = {data: 123};
    circularReference.self = circularReference;

    expect(stringifyWithMask([], "", circularReference)).toEqual(`{"data":123}`);

    circularReference.self = {};
    circularReference.self.topSelf = circularReference;
    circularReference.self.anotherSelf = circularReference.self;
    expect(stringifyWithMask([], "", circularReference)).toEqual(`{"data":123,"self":{}}`);

    delete circularReference.self;
    expect(stringifyWithMask([], "", circularReference)).toEqual(`{"data":123}`);
});

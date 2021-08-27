import {all, call, race} from "../src/typed-saga";
import {call as rawCall, delay, Effect} from "redux-saga/effects";

describe("typed-saga (functional test)", () => {
    interface APIResponse {
        foo: number;
    }

    async function fetchAPI(value: number): Promise<APIResponse> {
        return {foo: value * 2};
    }

    test("typed saga call", () => {
        function* saga() {
            const apiResult = yield* call(fetchAPI, 50);
            yield apiResult;
        }
        const sagaGenerator = saga();

        const firstYield = sagaGenerator.next();
        const callEffect = rawCall(fetchAPI, 50);
        expect(firstYield.done).toBe(false);
        expect(firstYield.value).toEqual(callEffect);

        /**
         * Must pass parameter to next() to mock the whole saga workflow
         * Ref: https://redux-saga.js.org/docs/advanced/Testing.html
         */
        const secondYield = sagaGenerator.next({foo: 100});
        expect(secondYield.done).toBe(false);
        expect(secondYield.value).toEqual({foo: 100});

        const thirdYield = sagaGenerator.next();
        expect(thirdYield.done).toBe(true);
        expect(thirdYield.value).toBeUndefined();
    });
});

describe("typed-saga (type test)", () => {
    describe("race", () => {
        test("should accept an object as parameter", () => {
            race({});
            race({d1: delay(1), d2: delay(2)});

            function* testTyping() {
                const {a, b, c, d, e} = yield* race({
                    a: call(async (_: number): Promise<number> => _, 1),
                    b: call(async (_: string): Promise<string> => _, "s"),
                    c: call(async (_: {foo: number; bar: string}): Promise<{baz: boolean}> => ({baz: true}), {foo: 0, bar: ""}),
                    d: delay(10),
                    e: Promise.resolve("a"),
                });

                const [_a, _b, _c, _d, _e]: [
                    // prettier-reserve
                    number | undefined,
                    string | undefined,
                    {baz: boolean} | undefined,
                    Effect | undefined,
                    string | undefined
                ] = [a, b, c, d, e];
            }
        });

        test("should accept an array as parameter", () => {
            race([]);
            race([delay(1), delay(2)]);

            function* testTyping() {
                const [a, b, c, d, e] = yield* race([
                    // prettier-reserve
                    call(async (_: number): Promise<number> => _, 1),
                    call(async (_: string): Promise<string> => _, "s"),
                    call(async (_: {foo: number; bar: string}): Promise<{baz: boolean}> => ({baz: true}), {foo: 0, bar: ""}),
                    delay(10),
                    Promise.resolve("a"),
                ]);
                const [_a, _b, _c, _d, _e]: [
                    // prettier-reserve
                    number | undefined,
                    string | undefined,
                    {baz: boolean} | undefined,
                    Effect | undefined,
                    string | undefined
                ] = [a, b, c, d, e];
            }
        });

        test("should not accept any primitive values as parameter", () => {
            // @ts-expect-error
            race(undefined);
            // @ts-expect-error
            race(null);
            // @ts-expect-error
            race(1);
            // @ts-expect-error
            race(true);
            // @ts-expect-error
            race("string");
            // @ts-expect-error
            race(Symbol.for("symbol"));
        });
    });

    describe("all", () => {
        test("should accept an object as parameter", () => {
            all({});
            all({d1: delay(1), d2: delay(2)});

            function* testTyping() {
                const {a, b, c, d, e} = yield* all({
                    a: call(async (_: number): Promise<number> => _, 1),
                    b: call(async (_: string): Promise<string> => _, "s"),
                    c: call(async (_: {foo: number; bar: string}): Promise<{baz: boolean}> => ({baz: true}), {foo: 0, bar: ""}),
                    d: delay(10),
                    e: Promise.resolve("a"),
                });

                const [_a, _b, _c, _d, _e]: [number, string, {baz: boolean}, Effect, string] = [a, b, c, d, e];
            }
        });

        test("should accept an array as parameter", () => {
            all([]);
            all([delay(1), delay(2)]);

            function* testTyping() {
                const [a, b, c, d, e] = yield* all([
                    // prettier-reserve
                    call(async (_: number): Promise<number> => _, 1),
                    call(async (_: string): Promise<string> => _, "s"),
                    call(async (_: {foo: number; bar: string}): Promise<{baz: boolean}> => ({baz: true}), {foo: 0, bar: ""}),
                    delay(10),
                    Promise.resolve("a"),
                ]);

                const [_a, _b, _c, _d, _e]: [number, string, {baz: boolean}, Effect, string] = [a, b, c, d, e];
            }
        });

        test("should not accept any primitive values as parameter", () => {
            // @ts-expect-error
            all(undefined);
            // @ts-expect-error
            all(null);
            // @ts-expect-error
            all(1);
            // @ts-expect-error
            all(true);
            // @ts-expect-error
            all("string");
            // @ts-expect-error
            all(Symbol.for("symbol"));
        });
    });
});

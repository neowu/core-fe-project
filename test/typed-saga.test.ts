import {call} from "../src/typed-saga";
import {call as rawCall} from "redux-saga/effects";

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

/* eslint-disable @typescript-eslint/ban-ts-comment */

import {SagaIterator, useModuleAction as useModuleActionImpl} from "../src";
import {Action} from "../src/reducer";

type ActionCreator<P extends any[]> = (...args: P) => Action<P>;

// Only test type
const useModuleAction: typeof useModuleActionImpl = (() => () => {}) as any;

describe("useModuleAction(type test)", () => {
    test("Should accept ActionCreator with only primitive dependency", () => {
        const allPrimitiveActionCreator: ActionCreator<[number, string, number]> = (a, b, c) => ({type: "test", payload: [a, b, c]});

        const curry1 = useModuleAction(allPrimitiveActionCreator, 1);
        const expectCurry1ToPass = curry1("", 3);

        const curry2 = useModuleAction(allPrimitiveActionCreator, 1, "2");
        const expectCurry2ToPass = curry2(3);

        const allCurry = useModuleAction(allPrimitiveActionCreator, 1, "", 3);
        const expectAllCurryToPass = allCurry();

        test("Should reject ActionCreators with object as deps", () => {
            const updateAction: ActionCreator<[string, {value: number}]> = (id: string, data: {value: number}) => ({type: "test", payload: [id, data]});
            const noDeps = useModuleAction(updateAction);
            const expectToPass = noDeps("id", {value: 2});

            const updateDataWithId = useModuleAction(updateAction, "sample id");
            const expectUpdateWithIdToPass = updateDataWithId({value: 3});

            // @ts-expect-error
            const updateDataWithObject = useModuleAction(updateAction, "id", {value: 2});
        });

        test("type union test", () => {
            const createTabChangeAction: ActionCreator<["a" | "b" | "c"]> = (tab) => ({type: "String Union test", payload: [tab]});
            const changeToA = useModuleAction(createTabChangeAction, "a");
            const changeToB = useModuleAction(createTabChangeAction, "b");
            const changeToC = useModuleAction(createTabChangeAction, "c");

            // @ts-expect-error
            const expectToFail = useModuleAction(createTabChangeAction, "not valid");
            // @ts-expect-error
            const expectToFail = useModuleAction(createTabChangeAction, null);
            // @ts-expect-error
            const shouldNotHaveParam = changeToA(1);

            const shouldBeSameFunction = useModuleAction(createTabChangeAction);

            const expectToPassA = shouldBeSameFunction("a");
            const expectToPassB = shouldBeSameFunction("b");
            const expectToPassC = shouldBeSameFunction("c");

            // @ts-expect-error
            const expectToFailNumber = shouldBeSameFunction(1);
            // @ts-expect-error
            const expectToFailString = shouldBeSameFunction("not valid");
        });
    });
});

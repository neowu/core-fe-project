import {useModuleAction} from "../src/hooks";
import {Action} from "../src/reducer";

/**
 * Using real useModuleAction in Jest environment will error, because the hooks are not called in a React component context.
 */
jest.mock("../src/hooks", () => ({useModuleAction: () => () => {}}));

type ActionCreator<P extends any[]> = (...args: P) => Action<P>;

describe("useModuleAction(type test)", () => {
    test("Should accept ActionCreator with only primitive dependency", () => {
        const allPrimitiveActionCreator: ActionCreator<[number, string, boolean]> = (a, b, c) => ({type: "test", payload: [a, b, c]});

        const curry1 = useModuleAction(allPrimitiveActionCreator, 1);
        const expectCurry1ToPass = curry1("", false);
        // @ts-expect-error
        const expectWrongParamToFail = curry1(3, "s");

        const curry2 = useModuleAction(allPrimitiveActionCreator, 1, "2");
        const expectCurry2ToPass = curry2(true);
        // @ts-expect-error
        const expectWrongParamToFail = curry2("s");

        const allCurry = useModuleAction(allPrimitiveActionCreator, 1, "", false);
        const expectAllCurryToPass = allCurry();
    });

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
        const expectPassA = changeToA();
        const expectPassB = changeToB();
        const expectPassC = changeToC();

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

    test("String literal union with multiple param", () => {
        const createTabChangeAction: ActionCreator<["a" | "b" | "c" | null, {data: string}]> = (tab, data) => ({type: "String Union test", payload: [tab, data]});
        const changeToA = useModuleAction(createTabChangeAction, "a");
        const changeToB = useModuleAction(createTabChangeAction, "b");
        const changeToC = useModuleAction(createTabChangeAction, "c");

        const expectChangeToAToPass = changeToA({data: "test"});

        // @ts-expect-error
        const expectToFail = changeToA("");
    });
});

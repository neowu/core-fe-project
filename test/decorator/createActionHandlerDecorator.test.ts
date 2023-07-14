import {Module, SagaGenerator, State, createActionHandlerDecorator, register} from "../../src";

describe("createActionHandlerDecorator", () => {
    test("obtain action name", () => {
        const mock = jest.fn(_ => _);
        const testDecorator = createActionHandlerDecorator(function* (handler) {
            mock(handler.actionName);
        });

        class Person extends Module<State, "person"> {
            @testDecorator
            *test(): SagaGenerator {}
        }

        const mary = new Person("person", {});
        register(mary); //actionName is attached after register()

        mary.test().next();
        expect(mock).toBeCalledTimes(1);
        expect(mock).toReturnWith("person/test");
    });
});

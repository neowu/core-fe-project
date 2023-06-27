import {Module, NetworkConnectionException, SagaGenerator, SilentOnNetworkConnectionError, State} from "../../src";
import {JavaScriptException} from "../../src/Exception";

describe("SilentOnNetworkConnectionError", () => {
    it("should silent and only silent NetworkConnectionException", () => {
        const mock = jest.fn();
        class Person extends Module<State, "person"> {
            @SilentOnNetworkConnectionError()
            *throwNetworkConnectionException(): SagaGenerator {
                mock();
                throw new NetworkConnectionException("", "");
            }

            @SilentOnNetworkConnectionError()
            *throwJavaScriptException(): SagaGenerator {
                mock();
                throw new JavaScriptException("", "");
            }
        }

        const person = new Person("person", {});
        expect(() => person.throwNetworkConnectionException().next()).not.toThrow();
        expect(mock).toBeCalledTimes(1);

        expect(() => person.throwJavaScriptException().next()).toThrow();
        expect(mock).toBeCalledTimes(2);
    });
});

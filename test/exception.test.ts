import {RuntimeException} from "../src/Exception";
import {errorAction} from "../src/reducer";

test("errorAction", () => {
    const errorMessage = "runtime error message";
    const error = new Error(errorMessage);
    expect(errorAction(error)).toEqual({payload: new RuntimeException(errorMessage, error), type: "@@framework/error"});

    expect(errorAction(null)).toEqual({payload: new RuntimeException("unknown error", null), type: "@@framework/error"});
});

import {errorAction, NotFoundException, RuntimeException} from "action/exception";

test("errorAction", () => {
    const notFoundException = new NotFoundException();
    expect(errorAction(notFoundException)).toEqual({payload: notFoundException, type: "@@framework/error"});

    const errorMessage = "runtime error message";
    const error = new Error(errorMessage);
    expect(errorAction(error)).toEqual({payload: new RuntimeException(errorMessage, error), type: "@@framework/error"});

    expect(errorAction(null)).toEqual({payload: new RuntimeException("unknown error", null), type: "@@framework/error"});
});

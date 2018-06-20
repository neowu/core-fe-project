import {errorAction} from "exception";

test("errorAction", () => {
    expect(errorAction(null)).toEqual({payload: null, type: "@@framework/error"});
});
